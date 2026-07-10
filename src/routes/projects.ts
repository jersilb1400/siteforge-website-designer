import { Hono } from 'hono';
import type { Env, Vars } from '../types';
import { one, all, batch, run } from '../lib/db';
import { id } from '../lib/id';
import { BadRequest, NotFound } from '../lib/errors';
import { requireOperator } from '../middleware/auth';
import { parseAnswers, progress } from '../interview/engine';

// Operator-facing project management. All routes require the operator token.

export const projects = new Hono<{ Bindings: Env; Variables: Vars }>();

projects.use('*', requireOperator);

interface ProjectRow {
  id: string;
  client_id: string;
  name: string;
  status: string;
  industry: string | null;
  tone: string | null;
  created_at: string;
  updated_at: string;
}

// Create a client + project + interview session in one atomic step.
projects.post('/', async (c) => {
  type Body = { clientName?: string; contactEmail?: string; projectName?: string };
  const body = await c.req.json<Body>().catch(() => ({}) as Body);

  const clientName = body.clientName?.trim();
  if (!clientName) throw new BadRequest('clientName is required.');
  const projectName = body.projectName?.trim() || `${clientName} website`;

  const clientId = id('client');
  const projectId = id('proj');
  const sessionId = id('sess');

  await batch(c.env, [
    {
      sql: 'INSERT INTO clients (id, name, contact_email) VALUES (?, ?, ?)',
      params: [clientId, clientName, body.contactEmail?.trim() ?? null],
    },
    {
      sql: 'INSERT INTO projects (id, client_id, name) VALUES (?, ?, ?)',
      params: [projectId, clientId, projectName],
    },
    {
      sql: 'INSERT INTO interview_sessions (id, project_id) VALUES (?, ?)',
      params: [sessionId, projectId],
    },
  ]);

  return c.json(
    {
      project: { id: projectId, clientId, name: projectName, status: 'interview' },
      interviewSessionId: sessionId,
      // Client shares this link to run the interview.
      interviewUrl: `/interview.html?s=${sessionId}`,
    },
    201,
  );
});

// List projects (most recent first) with a compact interview-progress readout.
projects.get('/', async (c) => {
  const rows = await all<ProjectRow & { client_name: string }>(
    c.env,
    `SELECT p.*, cl.name AS client_name
       FROM projects p JOIN clients cl ON cl.id = p.client_id
      ORDER BY p.created_at DESC
      LIMIT 100`,
  );
  return c.json({ projects: rows });
});

// Project detail: project + its interview session + progress snapshot.
projects.get('/:id', async (c) => {
  const projectId = c.req.param('id');
  const project = await one<ProjectRow>(c.env, 'SELECT * FROM projects WHERE id = ?', projectId);
  if (!project) throw new NotFound('project');

  const session = await one<{ id: string; status: string; phase: string }>(
    c.env,
    'SELECT id, status, phase FROM interview_sessions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1',
    projectId,
  );

  let interviewProgress = null;
  if (session) {
    const answerRows = await all<{ question_id: string; value_json: string }>(
      c.env,
      'SELECT question_id, value_json FROM interview_answers WHERE session_id = ?',
      session.id,
    );
    interviewProgress = progress(parseAnswers(answerRows));
  }

  return c.json({ project, session, interviewProgress });
});

/** Best-effort delete of every object under an R2 prefix (paginated). */
async function deleteR2Prefix(env: Env, prefix: string): Promise<number> {
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const listed = await env.R2.list({ prefix, cursor, limit: 1000 });
    for (const obj of listed.objects) {
      await env.R2.delete(obj.key);
      deleted++;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return deleted;
}

// Delete a project (and its demo) permanently: R2 builds/assets, then D1 row
// (CASCADE clears sessions, answers, sources, assets, builds, jobs). Orphan
// clients with no remaining projects are removed too.
projects.delete('/:id', async (c) => {
  const projectId = c.req.param('id');
  const project = await one<{ id: string; client_id: string; name: string }>(
    c.env,
    'SELECT id, client_id, name FROM projects WHERE id = ?',
    projectId,
  );
  if (!project) throw new NotFound('project');

  const builds = await all<{ id: string; bundle_r2_key: string | null }>(
    c.env,
    'SELECT id, bundle_r2_key FROM builds WHERE project_id = ?',
    projectId,
  );
  const assets = await all<{ r2_key: string }>(c.env, 'SELECT r2_key FROM assets WHERE project_id = ?', projectId);

  let r2Deleted = 0;
  for (const b of builds) {
    r2Deleted += await deleteR2Prefix(c.env, `builds/${b.id}/`);
    if (b.bundle_r2_key && b.bundle_r2_key !== `builds/${b.id}`) {
      r2Deleted += await deleteR2Prefix(c.env, b.bundle_r2_key.endsWith('/') ? b.bundle_r2_key : `${b.bundle_r2_key}/`);
    }
  }
  r2Deleted += await deleteR2Prefix(c.env, `projects/${projectId}/`);
  for (const a of assets) {
    try {
      await c.env.R2.delete(a.r2_key);
      r2Deleted++;
    } catch {
      /* already gone via prefix wipe */
    }
  }

  const clientId = project.client_id;
  await run(c.env, 'DELETE FROM projects WHERE id = ?', projectId);

  const remaining = await one<{ n: number }>(
    c.env,
    'SELECT COUNT(*) AS n FROM projects WHERE client_id = ?',
    clientId,
  );
  let clientDeleted = false;
  if ((remaining?.n ?? 0) === 0) {
    await run(c.env, 'DELETE FROM clients WHERE id = ?', clientId);
    clientDeleted = true;
  }

  return c.json({
    ok: true,
    deleted: { projectId, name: project.name, r2Objects: r2Deleted, clientDeleted },
  });
});
