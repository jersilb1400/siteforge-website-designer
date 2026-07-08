import { Hono } from 'hono';
import type { Env, Vars, IngestJob } from '../types';
import { one, all, run } from '../lib/db';
import { BadRequest, NotFound } from '../lib/errors';
import { requireOperator } from '../middleware/auth';
import { parseAnswers } from '../interview/engine';

// Ingestion + review API (operator-gated). Trigger enqueues async scrape jobs;
// the queue consumer writes normalized source_content rows with review_status
// 'pending'. Nothing is used by generation until a row is confirmed here.

export const ingest = new Hono<{ Bindings: Env; Variables: Vars }>();
ingest.use('*', requireOperator);

async function projectOrThrow(env: Env, projectId: string) {
  const p = await one<{ id: string; status: string }>(env, 'SELECT id, status FROM projects WHERE id = ?', projectId);
  if (!p) throw new NotFound('project');
  return p;
}

// Discover source URLs from the interview answers unless overridden in the body.
async function discoverSources(env: Env, projectId: string) {
  const session = await one<{ id: string }>(
    env,
    'SELECT id FROM interview_sessions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1',
    projectId,
  );
  if (!session) return {};
  const rows = await all<{ question_id: string; value_json: string }>(
    env,
    'SELECT question_id, value_json FROM interview_answers WHERE session_id = ?',
    session.id,
  );
  const a = parseAnswers(rows);
  const s = (k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : '');
  return { website: s('current_website'), facebook: s('facebook_url'), googleBusiness: s('google_business') };
}

// POST /api/projects/:id/ingest — enqueue scrape jobs for the project's sources.
ingest.post('/projects/:id/ingest', async (c) => {
  const projectId = c.req.param('id');
  await projectOrThrow(c.env, projectId);

  const body = await c.req
    .json<{ website?: string; facebook?: string; googleBusiness?: string }>()
    .catch(() => ({}) as { website?: string; facebook?: string; googleBusiness?: string });
  const discovered = await discoverSources(c.env, projectId);

  const website = (body.website ?? discovered.website ?? '').trim();
  const facebook = (body.facebook ?? discovered.facebook ?? '').trim();
  const googleBusiness = (body.googleBusiness ?? discovered.googleBusiness ?? '').trim();

  const jobs: IngestJob[] = [];
  if (website) jobs.push({ kind: 'scrape_website', projectId, url: website });
  if (facebook) jobs.push({ kind: 'scrape_facebook', projectId, url: facebook });
  if (googleBusiness) jobs.push({ kind: 'scrape_google_business', projectId, query: googleBusiness });

  if (!jobs.length) {
    throw new BadRequest('No sources to ingest. Provide a website, Facebook, or Google Business URL.');
  }

  for (const job of jobs) await c.env.INGEST_QUEUE.send(job);
  await run(c.env, `UPDATE projects SET status='ingesting', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, projectId);

  return c.json({ enqueued: jobs.map((j) => j.kind) }, 202);
});

interface SourceRow {
  id: string;
  source_type: string;
  source_url: string | null;
  confidence: string;
  data_json: string;
  review_status: string;
  created_at: string;
}

// GET /api/projects/:id/source-content — list ingested rows for review.
ingest.get('/projects/:id/source-content', async (c) => {
  const projectId = c.req.param('id');
  await projectOrThrow(c.env, projectId);
  const rows = await all<SourceRow>(
    c.env,
    'SELECT id, source_type, source_url, confidence, data_json, review_status, created_at FROM source_content WHERE project_id = ? ORDER BY created_at DESC',
    projectId,
  );
  const items = rows.map((r) => ({
    id: r.id,
    sourceType: r.source_type,
    sourceUrl: r.source_url,
    confidence: r.confidence,
    reviewStatus: r.review_status,
    createdAt: r.created_at,
    data: safeParse(r.data_json),
  }));

  const assets = await all<{ id: string; r2_key: string; source_url: string | null; alt_text: string | null }>(
    c.env,
    'SELECT id, r2_key, source_url, alt_text FROM assets WHERE project_id = ? ORDER BY created_at DESC LIMIT 60',
    projectId,
  );
  return c.json({ items, assets });
});

// PATCH /api/source-content/:id — confirm / reject / edit a reviewed row.
// This is the content-ethics gate: only 'confirmed' | 'edited' rows may be used
// by the generation engine (Phase 3).
ingest.patch('/source-content/:id', async (c) => {
  const scId = c.req.param('id');
  const existing = await one<{ id: string; data_json: string }>(c.env, 'SELECT id, data_json FROM source_content WHERE id = ?', scId);
  if (!existing) throw new NotFound('source content');

  const body = await c.req
    .json<{ reviewStatus?: string; data?: unknown }>()
    .catch(() => ({}) as { reviewStatus?: string; data?: unknown });

  const allowed = ['pending', 'confirmed', 'rejected', 'edited'];
  let status = body.reviewStatus;
  if (status && !allowed.includes(status)) throw new BadRequest(`reviewStatus must be one of ${allowed.join(', ')}.`);

  // Editing the data implies an edited-and-approved row unless caller says otherwise.
  let dataJson = existing.data_json;
  if (body.data !== undefined) {
    dataJson = JSON.stringify(body.data);
    status = status ?? 'edited';
  }
  if (!status) throw new BadRequest('Provide reviewStatus and/or data.');

  await run(
    c.env,
    `UPDATE source_content SET review_status = ?, data_json = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
    status,
    dataJson,
    scId,
  );
  return c.json({ id: scId, reviewStatus: status });
});

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
