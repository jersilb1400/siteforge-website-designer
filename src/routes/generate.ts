import { Hono } from 'hono';
import type { Env, Vars } from '../types';
import { all, one } from '../lib/db';
import { NotFound } from '../lib/errors';
import { requireOperator } from '../middleware/auth';
import { generateBuild } from '../generate/bundle';
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

// GET /api/projects/:id/builds — version history (newest first).
generate.get('/projects/:id/builds', async (c) => {
  const projectId = c.req.param('id');
  const project = await one<{ id: string }>(c.env, 'SELECT id FROM projects WHERE id = ?', projectId);
  if (!project) throw new NotFound('project');
  const builds = await all<{
    id: string;
    version: number;
    status: string;
    theme_id: string;
    preview_url: string;
    created_at: string;
  }>(
    c.env,
    'SELECT id, version, status, theme_id, preview_url, created_at FROM builds WHERE project_id = ? ORDER BY version DESC',
    projectId,
  );
  return c.json({ builds });
});
