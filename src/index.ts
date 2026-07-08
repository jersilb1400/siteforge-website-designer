import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env, Vars, IngestJob } from './types';
import { AppError } from './lib/errors';
import { id } from './lib/id';
import { health } from './routes/health';
import { projects } from './routes/projects';
import { interview } from './routes/interview';
import { handleQueue } from './queue/consumer';

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
app.route('/api', api);

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
