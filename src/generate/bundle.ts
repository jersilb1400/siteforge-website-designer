import type { Env } from '../types';
import { one, all, run } from '../lib/db';
import { id } from '../lib/id';
import { NotFound, BadRequest } from '../lib/errors';
import { parseAnswers, buildProfile } from '../interview/engine';
import { resolvePalette } from './palette';
import { selectTheme, getTheme, themeExists } from './themes';
import { generateContent, type ContentInputs } from './content';
import { renderSite } from './render';
import { sectionsForPages, type SiteSpec, type SiteImage } from './spec';

// Orchestrates a build: interview profile + CONFIRMED source content -> spec ->
// rendered, self-contained bundle stored in R2 (its own images included) ->
// versioned `builds` row. Preview is served from R2 by the /preview route.

interface SourceRow {
  source_type: string;
  data_json: string;
  review_status: string;
}

function mergeConfirmed(rows: SourceRow[]) {
  const confirmed = rows.filter((r) => r.review_status === 'confirmed' || r.review_status === 'edited');
  const out: { about?: string; description?: string; headings?: string[]; hours?: string; palette?: string[] } = {};
  for (const r of confirmed) {
    let d: any = {};
    try { d = JSON.parse(r.data_json); } catch { /* ignore */ }
    out.about ??= d.about;
    out.description ??= d.description;
    out.hours ??= d.hours;
    if (!out.headings && Array.isArray(d.headings)) out.headings = d.headings;
    if (!out.palette && Array.isArray(d.palette)) out.palette = d.palette;
  }
  return { confirmed, merged: out };
}

async function nextVersion(env: Env, projectId: string): Promise<number> {
  const row = await one<{ v: number }>(env, 'SELECT MAX(version) AS v FROM builds WHERE project_id = ?', projectId);
  return (row?.v ?? 0) + 1;
}

export interface BuildResult {
  buildId: string;
  version: number;
  themeId: string;
  previewUrl: string;
}

export async function generateBuild(env: Env, projectId: string, themeOverride?: string): Promise<BuildResult> {
  const project = await one<{ id: string; industry: string | null; tone: string | null }>(
    env,
    'SELECT id, industry, tone FROM projects WHERE id = ?',
    projectId,
  );
  if (!project) throw new NotFound('project');

  // Load the interview profile.
  const session = await one<{ id: string }>(
    env,
    'SELECT id FROM interview_sessions WHERE project_id = ? ORDER BY created_at DESC LIMIT 1',
    projectId,
  );
  if (!session) throw new BadRequest('This project has no interview to generate from.');
  const answerRows = await all<{ question_id: string; value_json: string }>(
    env,
    'SELECT question_id, value_json FROM interview_answers WHERE session_id = ?',
    session.id,
  );
  const profile = buildProfile(parseAnswers(answerRows));
  if (!profile.business.name) throw new BadRequest('Complete the interview before generating (business name missing).');

  // Confirmed source content (content-ethics gate: only confirmed/edited used).
  const sourceRows = await all<SourceRow>(
    env,
    'SELECT source_type, data_json, review_status FROM source_content WHERE project_id = ?',
    projectId,
  );
  const { merged } = mergeConfirmed(sourceRows);

  const buildId = id('build');
  const buildPrefix = `builds/${buildId}`;

  // Reserve the versioned build row FIRST (status 'building') so concurrent
  // generates can't collide on the UNIQUE(project_id, version) constraint after
  // doing expensive R2 work. Retry a few times if two callers race the MAX+1.
  const version = await reserveBuild(env, projectId, buildId);

  try {
    return await runBuild(env, { projectId, buildId, buildPrefix, version, profile, merged, themeOverride });
  } catch (err) {
    // Mark failed so the orphaned row is visible; R2 objects under buildPrefix
    // are namespaced to this failed build and can be swept later.
    await run(env, `UPDATE builds SET status='failed', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, buildId).catch(() => {});
    throw err;
  }
}

async function reserveBuild(env: Env, projectId: string, buildId: string): Promise<number> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const version = await nextVersion(env, projectId);
    try {
      await run(
        env,
        `INSERT INTO builds (id, project_id, version, status) VALUES (?, ?, ?, 'building')`,
        buildId,
        projectId,
        version,
      );
      return version;
    } catch {
      // Likely a UNIQUE(project_id, version) race — recompute and retry.
    }
  }
  throw new BadRequest('Could not reserve a build version; please retry.');
}

interface RunArgs {
  projectId: string;
  buildId: string;
  buildPrefix: string;
  version: number;
  profile: ReturnType<typeof buildProfile>;
  merged: { about?: string; description?: string; headings?: string[]; hours?: string; palette?: string[] };
  themeOverride?: string;
}

async function runBuild(env: Env, args: RunArgs): Promise<BuildResult> {
  const { projectId, buildId, buildPrefix, version, profile, merged, themeOverride } = args;

  // Copy owned images into the build folder so the bundle is self-contained
  // (portable to a real deploy). Content-ethics gate: ONLY images individually
  // approved (review_status confirmed/edited) may be published — confirming a
  // text source does not consent to scraped media.
  const images: SiteImage[] = [];
  {
    const assetRows = await all<{ id: string; r2_key: string; alt_text: string | null }>(
      env,
      `SELECT id, r2_key, alt_text FROM assets
        WHERE project_id = ? AND review_status IN ('confirmed','edited')
        ORDER BY created_at ASC LIMIT 8`,
      projectId,
    );
    let i = 0;
    for (const a of assetRows) {
      const obj = await env.R2.get(a.r2_key);
      if (!obj) continue;
      const ext = a.r2_key.split('.').pop() || 'bin';
      const rel = `media/${i}.${ext}`;
      await env.R2.put(`${buildPrefix}/${rel}`, await obj.arrayBuffer(), {
        httpMetadata: { contentType: obj.httpMetadata?.contentType || 'image/jpeg' },
      });
      images.push({ src: rel, alt: a.alt_text || profile.business.name });
      i++;
    }
  }

  // Resolve palette + theme + copy.
  const palette = resolvePalette({
    brandColors: profile.brand.colors,
    generatePalette: profile.brand.generatePalette,
    scrapedPalette: merged.palette,
    tone: profile.tone,
  });
  if (themeOverride && !themeExists(themeOverride)) {
    throw new BadRequest(`Unknown themeId "${themeOverride}".`);
  }
  const theme = themeOverride ? getTheme(themeOverride) : selectTheme(profile.business.industry, profile.tone);

  const contentInputs: ContentInputs = { profile, confirmed: merged };
  const content = await generateContent(env, contentInputs);

  const spec: SiteSpec = {
    projectId,
    themeId: theme.id,
    business: {
      name: profile.business.name,
      tagline: profile.business.tagline,
      industry: profile.business.industry,
      tone: profile.tone,
      story: profile.business.story,
    },
    contact: {
      email: profile.contact.email,
      phone: profile.contact.phone,
      address: profile.contact.address,
      hours: profile.contact.hours || merged.hours || '',
      socials: {},
    },
    sections: sectionsForPages(profile.pages),
    palette,
    images,
    content,
    generatedAt: new Date().toISOString(),
  };

  // Render + store the bundle.
  const { files } = renderSite(spec);
  for (const [path, body] of Object.entries(files)) {
    await env.R2.put(`${buildPrefix}/${path}`, body, { httpMetadata: { contentType: contentTypeFor(path) } });
  }

  // Flip the reserved row to ready with the full metadata.
  const previewUrl = `/preview/${buildId}/`;
  await run(
    env,
    `UPDATE builds SET status='ready', theme_id=?, bundle_r2_key=?, preview_url=?, spec_json=?,
            updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
    theme.id,
    buildPrefix,
    previewUrl,
    JSON.stringify(spec),
    buildId,
  );
  await run(env, `UPDATE projects SET status='preview', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, projectId);

  return { buildId, version, themeId: theme.id, previewUrl };
}

function contentTypeFor(path: string): string {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js')) return 'text/javascript';
  return 'application/octet-stream';
}
