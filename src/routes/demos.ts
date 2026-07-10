import { Hono } from 'hono';
import type { Env, Vars } from '../types';
import { batch, run } from '../lib/db';
import { id } from '../lib/id';
import { BadRequest } from '../lib/errors';
import { requireOperator } from '../middleware/auth';
import { questionById, QUESTIONS } from '../interview/questions';
import { generateBuild } from '../generate/bundle';
import { themeExists } from '../generate/themes';
import {
  buildDemoAnswers,
  buildDemoSourceData,
  getDemoSeed,
  isDemoIndustry,
  listDemoIndustries,
  type DemoBrief,
} from '../generate/demo/catalog';

// Sales-demo API (operator-gated). Creates a real project seeded with synthetic
// interview answers + confirmed catalog content, then runs the normal generate
// pipeline so the prospect gets a polished preview in one click.

export const demos = new Hono<{ Bindings: Env; Variables: Vars }>();
demos.use('*', requireOperator);

demos.get('/industries', (c) => c.json({ industries: listDemoIndustries() }));

demos.post('/', async (c) => {
  const body = await c.req.json<Partial<DemoBrief>>().catch(() => ({}) as Partial<DemoBrief>);
  const businessName = body.businessName?.trim();
  const industry = body.industry?.trim();
  if (!businessName) throw new BadRequest('businessName is required.');
  if (!industry) throw new BadRequest('industry is required.');
  if (!isDemoIndustry(industry)) {
    throw new BadRequest(`Unknown industry "${industry}". Use GET /api/demos/industries.`);
  }
  if (body.themeId && !themeExists(body.themeId)) {
    throw new BadRequest(`Unknown themeId "${body.themeId}".`);
  }

  const seed = getDemoSeed(industry)!;
  const brief: DemoBrief = {
    businessName,
    industry,
    tagline: body.tagline,
    blurb: body.blurb,
    phone: body.phone,
    email: body.email,
    city: body.city,
    logoUrl: body.logoUrl,
    themeId: body.themeId,
  };

  const clientId = id('client');
  const projectId = id('proj');
  const sessionId = id('sess');
  const projectName = `Demo — ${businessName}`;
  const answers = buildDemoAnswers(brief, seed);
  const sourceData = buildDemoSourceData(brief, seed);
  const sourceId = id('src');

  const statements: Array<{ sql: string; params?: unknown[] }> = [
    {
      sql: 'INSERT INTO clients (id, name, contact_email) VALUES (?, ?, ?)',
      params: [clientId, businessName, brief.email?.trim() || null],
    },
    {
      sql: 'INSERT INTO projects (id, client_id, name, status, industry, tone) VALUES (?, ?, ?, ?, ?, ?)',
      params: [projectId, clientId, projectName, 'generating', seed.industry, seed.tone],
    },
    {
      sql: `INSERT INTO interview_sessions (id, project_id, status, phase, next_question_id)
            VALUES (?, ?, 'complete', 'content', NULL)`,
      params: [sessionId, projectId],
    },
  ];

  for (const q of QUESTIONS) {
    if (!(q.id in answers)) continue;
    const value = answers[q.id];
    const qMeta = questionById(q.id);
    statements.push({
      sql: `INSERT INTO interview_answers (id, session_id, question_id, question_text, value_json, source)
            VALUES (?, ?, ?, ?, ?, 'ai')`,
      params: [id('ans'), sessionId, q.id, qMeta?.text ?? q.id, JSON.stringify(value)],
    });
  }

  statements.push({
    sql: `INSERT INTO source_content (id, project_id, source_type, source_url, confidence, data_json, review_status)
          VALUES (?, ?, 'manual', NULL, 'manual', ?, 'confirmed')`,
    params: [sourceId, projectId, JSON.stringify(sourceData)],
  });

  await batch(c.env, statements);

  if (brief.logoUrl?.trim()) {
    await ingestDemoLogo(c.env, projectId, brief.logoUrl.trim(), businessName);
  }

  const themeOverride = brief.themeId || seed.themeId;
  const result = await generateBuild(c.env, projectId, themeOverride);

  return c.json(
    {
      projectId,
      clientId,
      buildId: result.buildId,
      version: result.version,
      themeId: result.themeId,
      previewUrl: result.previewUrl,
      siteUrl: `/site/${projectId}/`,
      quality: result.quality,
      demo: true,
    },
    201,
  );
});

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const UA = 'SiteForgeBot/0.1 (+https://siteforge.dev/bot)';

async function ingestDemoLogo(env: Env, projectId: string, logoUrl: string, businessName: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(logoUrl);
  } catch {
    throw new BadRequest('logoUrl must be a valid http(s) URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new BadRequest('logoUrl must use http or https.');
  }

  try {
    const res = await fetch(logoUrl, { headers: { 'user-agent': UA } });
    if (!res.ok) throw new BadRequest(`Could not fetch logoUrl (HTTP ${res.status}).`);
    const mime = (res.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
    if (!mime.startsWith('image/')) throw new BadRequest('logoUrl must point to an image.');
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > LOGO_MAX_BYTES) {
      throw new BadRequest('logoUrl image must be under 2 MB.');
    }
    const ext =
      { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }[
        mime
      ] || 'bin';
    const assetId = id('asset');
    const r2Key = `projects/${projectId}/logo/${assetId}.${ext}`;
    await env.R2.put(r2Key, buf, { httpMetadata: { contentType: mime } });
    await run(
      env,
      `INSERT INTO assets (id, project_id, r2_key, kind, mime_type, source_url, alt_text, bytes, review_status)
       VALUES (?, ?, ?, 'logo', ?, ?, ?, ?, 'confirmed')`,
      assetId,
      projectId,
      r2Key,
      mime,
      logoUrl,
      `${businessName} logo`,
      buf.byteLength,
    );
  } catch (err) {
    if (err instanceof BadRequest) throw err;
    throw new BadRequest(`Failed to fetch logoUrl: ${String(err)}`);
  }
}
