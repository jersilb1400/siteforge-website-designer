import { Hono } from 'hono';
import type { Env, Vars } from '../types';
import { all, one, run } from '../lib/db';
import { NotFound, BadRequest } from '../lib/errors';
import { requireOperator } from '../middleware/auth';
import { generateBuild } from '../generate/bundle';
import { reviseBuild } from '../generate/revise';
import { listThemes } from '../generate/themes';

// Generation API (operator-gated). Kicks off a build synchronously (rendering is
// fast and deterministic) and returns the preview URL.

export const generate = new Hono<{ Bindings: Env; Variables: Vars }>();
generate.use('*', requireOperator);

generate.get('/themes', (c) => c.json({ themes: listThemes() }));

// POST /api/projects/:id/generate — build a new site version, return preview.
generate.post('/projects/:id/generate', async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json<{ themeId?: string }>().catch(() => ({}) as { themeId?: string });
  const result = await generateBuild(c.env, projectId, body.themeId);
  return c.json(result, 201);
});

// POST /api/projects/:id/revise — apply a natural-language change, new version.
generate.post('/projects/:id/revise', async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json<{ instruction?: string }>().catch(() => ({}) as { instruction?: string });
  if (!body.instruction) throw new BadRequest('Provide an "instruction".');
  const result = await reviseBuild(c.env, projectId, body.instruction);
  return c.json(result, 201);
});

// GET /api/projects/:id/builds — version history (newest first), with the
// published build flagged and quality scores surfaced.
generate.get('/projects/:id/builds', async (c) => {
  const projectId = c.req.param('id');
  const project = await one<{ id: string; published_build_id: string | null }>(
    c.env,
    'SELECT id, published_build_id FROM projects WHERE id = ?',
    projectId,
  );
  if (!project) throw new NotFound('project');
  const rows = await all<{
    id: string;
    version: number;
    status: string;
    theme_id: string;
    preview_url: string;
    lighthouse_json: string | null;
    created_at: string;
  }>(
    c.env,
    'SELECT id, version, status, theme_id, preview_url, lighthouse_json, created_at FROM builds WHERE project_id = ? ORDER BY version DESC',
    projectId,
  );
  const builds = rows.map((b) => ({
    id: b.id,
    version: b.version,
    status: b.status,
    theme_id: b.theme_id,
    preview_url: b.preview_url,
    created_at: b.created_at,
    published: b.id === project.published_build_id,
    quality: safeParse(b.lighthouse_json),
  }));
  return c.json({ builds, publishedBuildId: project.published_build_id, siteUrl: `/site/${projectId}/` });
});

// POST /api/builds/:id/publish — make a build the live site (served at /site/:projectId/).
// Blocks builds that fail the quality gate unless { force: true }.
generate.post('/builds/:id/publish', async (c) => {
  const buildId = c.req.param('id');
  const body = await c.req.json<{ force?: boolean }>().catch(() => ({}) as { force?: boolean });
  const build = await one<{ id: string; project_id: string; status: string; lighthouse_json: string | null }>(
    c.env,
    'SELECT id, project_id, status, lighthouse_json FROM builds WHERE id = ?',
    buildId,
  );
  if (!build) throw new NotFound('build');
  if (build.status !== 'ready' && build.status !== 'deployed') throw new BadRequest(`Build is not ready (status: ${build.status}).`);
  const quality = safeParse(build.lighthouse_json) as { pass?: boolean; score?: number } | null;
  if (quality && quality.pass === false && !body.force) {
    throw new BadRequest(`Build failed the quality gate (score ${quality.score}). Fix the issues or publish with force.`);
  }
  await run(c.env, `UPDATE builds SET status='deployed', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, buildId);
  await run(
    c.env,
    `UPDATE projects SET published_build_id = ?, status='deployed', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
    buildId,
    build.project_id,
  );
  return c.json({ published: buildId, siteUrl: `/site/${build.project_id}/` });
});

// POST /api/projects/:id/rollback — republish an earlier build.
generate.post('/projects/:id/rollback', async (c) => {
  const projectId = c.req.param('id');
  const body = await c.req.json<{ buildId?: string }>().catch(() => ({}) as { buildId?: string });
  if (!body.buildId) throw new BadRequest('Provide the buildId to roll back to.');
  const build = await one<{ id: string }>(
    c.env,
    `SELECT id FROM builds WHERE id = ? AND project_id = ? AND status IN ('ready','deployed')`,
    body.buildId,
    projectId,
  );
  if (!build) throw new NotFound('a ready build with that id for this project');
  await run(
    c.env,
    `UPDATE projects SET published_build_id = ?, status='deployed', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
    body.buildId,
    projectId,
  );
  return c.json({ published: body.buildId, siteUrl: `/site/${projectId}/` });
});

function safeParse(s: string | null): unknown {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}
