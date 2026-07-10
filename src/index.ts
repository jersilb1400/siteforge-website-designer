import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env, Vars, IngestJob } from './types';
import { AppError } from './lib/errors';
import { id } from './lib/id';
import { health } from './routes/health';
import { projects } from './routes/projects';
import { interview } from './routes/interview';
import { ingest } from './routes/ingest';
import { generate } from './routes/generate';
import { demos } from './routes/demos';
import { uploads } from './routes/uploads';
import { handleQueue } from './queue/consumer';
import { handleMcp } from './mcp/server';
import { requireOperator } from './middleware/auth';
import { SAMPLE_BUSINESS_HTML } from './dev/fixtures';

// SiteForge Worker entry. Owns /api/*; everything else falls through to static
// assets (the dashboard + generated-site previews) via the ASSETS binding.

const app = new Hono<{ Bindings: Env; Variables: Vars }>();

// Per-request id for correlating logs across a request's lifetime.
app.use('*', async (c, next) => {
  const rid = c.req.header('cf-ray') ?? id('req');
  c.set('requestId', rid);
  c.header('x-request-id', rid);
  await next();
});

app.use('*', logger());
app.use('/api/*', secureHeaders());

// --- API ---
const api = new Hono<{ Bindings: Env; Variables: Vars }>();
api.route('/', health);
api.route('/projects', projects);
api.route('/interview', interview);
api.route('/', ingest);
api.route('/', generate);
api.route('/demos', demos);
api.route('/', uploads);
app.route('/api', api);

// MCP server (Streamable HTTP, stateless JSON). Lets other Claude sessions drive
// SiteForge. Operator-token gated. One JSON-RPC request per POST.
app.post('/mcp', requireOperator, async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return c.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid JSON-RPC request.' } }, 400);
  }
  const res = await handleMcp(c.env, body);
  if (res === null) return c.body(null, 202); // notification ack
  return c.json(res);
});

// Preview server: stream a generated build's files from R2. Public so clients
// can view previews via the shareable link (build ids are unguessable).
app.get('/preview/:buildId/*', async (c) => {
  const buildId = c.req.param('buildId');
  const rest = c.req.path.split(`/preview/${buildId}/`)[1] || '';
  const key = `builds/${buildId}/${rest === '' ? 'index.html' : rest}`;
  const obj = await c.env.R2.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  const ct = obj.httpMetadata?.contentType;
  if (ct) headers.set('content-type', ct);
  headers.set('cache-control', 'no-cache');
  return new Response(obj.body, { headers });
});
// Bare /preview/:buildId -> index.html
app.get('/preview/:buildId', (c) => c.redirect(`/preview/${c.req.param('buildId')}/`));

// Published-site server: the v1 "production" surface. Serves whichever build a
// project has published, from R2. (A per-client subdomain via Cloudflare for
// SaaS is a later, escalation-gated step; the bundle in R2 is deploy-portable.)
app.get('/site/:projectId/*', async (c) => {
  const projectId = c.req.param('projectId');
  const project = await c.env.DB.prepare('SELECT published_build_id FROM projects WHERE id = ?')
    .bind(projectId)
    .first<{ published_build_id: string | null }>();
  if (!project?.published_build_id) return c.notFound();
  const rest = c.req.path.split(`/site/${projectId}/`)[1] || '';
  const key = `builds/${project.published_build_id}/${rest === '' ? 'index.html' : rest}`;
  const obj = await c.env.R2.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  const ct = obj.httpMetadata?.contentType;
  if (ct) headers.set('content-type', ct);
  headers.set('cache-control', 'public, max-age=300');
  return new Response(obj.body, { headers });
});
app.get('/site/:projectId', (c) => c.redirect(`/site/${c.req.param('projectId')}/`));

// Dev-only fixture page: lets the ingestion pipeline be verified end-to-end in
// `wrangler dev` without hitting the public internet. Never served in production.
app.get('/__fixtures/sample-business', (c) => {
  if (c.env.ENVIRONMENT !== 'development') return c.notFound();
  return c.html(SAMPLE_BUSINESS_HTML);
});
// A tiny real PNG so the asset-download path (fetch -> R2) is exercised locally.
app.get('/__fixtures/img/:name', (c) => {
  if (c.env.ENVIRONMENT !== 'development') return c.notFound();
  // 1x1 transparent PNG.
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  return c.body(bytes, 200, { 'content-type': 'image/png' });
});

// --- Errors: typed AppErrors -> clean JSON; everything else -> 500 ---
app.onError((err, c) => {
  const rid = c.get('requestId');
  if (err instanceof AppError) {
    return c.json(
      { error: { code: err.code, message: err.message, detail: err.detail ?? null }, requestId: rid },
      err.status as 400,
    );
  }
  console.error('unhandled error', { requestId: rid, err: String(err), stack: (err as Error).stack });
  return c.json(
    { error: { code: 'internal_error', message: 'Something went wrong.' }, requestId: rid },
    500,
  );
});

// Unknown /api route -> JSON 404 (don't fall through to static assets).
api.notFound((c) =>
  c.json({ error: { code: 'not_found', message: 'No such API route.' } }, 404),
);

// --- Static assets fallback for all non-API routes ---
app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  // Queue consumer for async ingestion (Phase 2+). The runtime types the batch
  // as MessageBatch<unknown>; our messages are always IngestJob.
  async queue(batch, env): Promise<void> {
    await handleQueue(batch as MessageBatch<IngestJob>, env);
  },
} satisfies ExportedHandler<Env>;
