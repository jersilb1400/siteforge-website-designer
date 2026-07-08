import { Hono } from 'hono';
import type { Env, Vars } from '../types';

// Health & readiness. `/api/health` is a cheap liveness ping; `/api/ready`
// actually touches D1 so a deploy can be verified end-to-end (the Phase 0
// deliverable: hit the endpoint and see it work).

export const health = new Hono<{ Bindings: Env; Variables: Vars }>();

health.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'siteforge',
    environment: c.env.ENVIRONMENT,
    time: new Date().toISOString(),
  }),
);

health.get('/ready', async (c) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    await c.env.DB.prepare('SELECT 1').first();
    checks.d1 = 'ok';
  } catch {
    checks.d1 = 'error';
  }

  try {
    // KV read of a non-existent key still exercises the binding.
    await c.env.KV.get('__health__');
    checks.kv = 'ok';
  } catch {
    checks.kv = 'error';
  }

  checks.anthropic = c.env.ANTHROPIC_API_KEY ? 'ok' : 'error';

  const ok = Object.values(checks).every((v) => v === 'ok');
  return c.json({ ok, checks }, ok ? 200 : 503);
});
