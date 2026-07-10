import type { Env } from '../types';
import { one, all, run } from '../lib/db';
import { id } from '../lib/id';
import { NotFound, BadRequest } from '../lib/errors';
import { parseAnswers, buildProfile } from '../interview/engine';
import { resolvePalette } from './palette';
import { selectTheme, getTheme, themeExists } from './themes';
import { generateContent, type ContentInputs, cleanHours } from './content';
import { renderSite } from './render';
import { sectionsForPages, type SiteSpec, type SiteImage } from './spec';
import { qualityCheck } from './quality';
import { deriveDesign } from './design-director';

// Orchestrates a build: interview profile + CONFIRMED source content -> spec ->
// rendered, self-contained bundle in R2 -> versioned `builds` row. Spec assembly
// and finalize are separate so the NL revision loop can reuse finalize with a
// mutated spec. Preview is served from R2 by the /preview route.

interface SourceRow {
  source_type: string;
  data_json: string;
  review_status: string;
}

function mergeConfirmed(rows: SourceRow[]) {
  const confirmed = rows.filter((r) => r.review_status === 'confirmed' || r.review_status === 'edited');
  const out: {
    about?: string;
    description?: string;
    headings?: string[];
    hours?: string;
    palette?: string[];
    services?: Array<{ name: string; desc: string }>;
    servicesTitle?: string;
    highlights?: string[];
    ctaLabel?: string;
    demo?: boolean;
  } = {};
  for (const r of confirmed) {
    let d: any = {};
    try { d = JSON.parse(r.data_json); } catch { /* ignore */ }
    out.about ??= d.about;
    out.description ??= d.description;
    out.hours ??= d.hours;
    if (!out.headings && Array.isArray(d.headings)) out.headings = d.headings;
    if (!out.palette && Array.isArray(d.palette)) out.palette = d.palette;
    if (!out.services && Array.isArray(d.services) && d.services.length) out.services = d.services;
    out.servicesTitle ??= d.servicesTitle;
    if (!out.highlights && Array.isArray(d.highlights)) out.highlights = d.highlights;
    out.ctaLabel ??= d.ctaLabel;
    if (d.demo) out.demo = true;
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
  quality: { score: number; pass: boolean };
}

// Assemble the full spec from the interview profile + confirmed source content.
// Images are left empty here; finalize copies approved assets into the build.
export async function assembleSpec(env: Env, projectId: string, themeOverride?: string): Promise<SiteSpec> {
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

  const sourceRows = await all<SourceRow>(
    env,
    'SELECT source_type, data_json, review_status FROM source_content WHERE project_id = ?',
    projectId,
  );
  const { merged } = mergeConfirmed(sourceRows);

  if (themeOverride && !themeExists(themeOverride)) throw new BadRequest(`Unknown themeId "${themeOverride}".`);
  const theme = themeOverride ? getTheme(themeOverride) : selectTheme(profile.business.industry, profile.tone);

  // Design director: bespoke, guardrailed art direction (fonts/signature/colors).
  // No-ops (null) without an API key — the theme defaults then stand.
  const design = await deriveDesign(
    env,
    { name: profile.business.name, industry: profile.business.industry, tone: profile.tone, story: profile.business.story },
    theme,
  );

  // Palette: the design director's brand/accent win when present (validated
  // hex), else fall back to explicit interview colors / scrape / tone default.
  const palette = resolvePalette({
    brandColors: design?.brand ? `${design.brand} ${design.accent ?? ''}` : profile.brand.colors,
    generatePalette: design?.brand ? false : profile.brand.generatePalette,
    scrapedPalette: merged.palette,
    tone: profile.tone,
  });

  const contentInputs: ContentInputs = { profile, confirmed: merged };
  const content = await generateContent(env, contentInputs);

  return {
    projectId,
    themeId: theme.id,
    ...(design
      ? { design: { fontDisplay: design.fontDisplay, fontBody: design.fontBody, fontHref: design.fontHref, signatureCss: design.signatureCss, rationale: design.rationale } }
      : {}),
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
      hours: cleanHours(profile.contact.hours || merged.hours || ''),
      socials: {},
    },
    sections: sectionsForPages(profile.pages),
    palette,
    images: [],
    content,
    generatedAt: new Date().toISOString(),
  };
}

// Reserve version, copy approved images, render, quality-check, store the build.
export async function finalizeBuild(env: Env, projectId: string, spec: SiteSpec): Promise<BuildResult> {
  const buildId = id('build');
  const buildPrefix = `builds/${buildId}`;
  const version = await reserveBuild(env, projectId, buildId);

  try {
    // Content-ethics gate: ONLY individually-approved images may be published.
    const images: SiteImage[] = [];
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
      images.push({ src: rel, alt: a.alt_text || spec.business.name });
      i++;
    }
    spec = { ...spec, images, generatedAt: new Date().toISOString() };

    const { files } = renderSite(spec);
    for (const [path, body] of Object.entries(files)) {
      await env.R2.put(`${buildPrefix}/${path}`, body, { httpMetadata: { contentType: contentTypeFor(path) } });
    }

    // Automated quality gate (proxy for the Lighthouse/WCAG bar; a real
    // Lighthouse run lives in scripts/lighthouse-gate.mjs for CI).
    const quality = qualityCheck(files['index.html'] ?? '', spec);

    const previewUrl = `/preview/${buildId}/`;
    await run(
      env,
      `UPDATE builds SET status='ready', theme_id=?, bundle_r2_key=?, preview_url=?, spec_json=?, lighthouse_json=?,
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      spec.themeId,
      buildPrefix,
      previewUrl,
      JSON.stringify(spec),
      JSON.stringify(quality),
      buildId,
    );
    await run(env, `UPDATE projects SET status='preview', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, projectId);

    return { buildId, version, themeId: spec.themeId, previewUrl, quality: { score: quality.score, pass: quality.pass } };
  } catch (err) {
    await run(env, `UPDATE builds SET status='failed', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, buildId).catch(() => {});
    throw err;
  }
}

async function reserveBuild(env: Env, projectId: string, buildId: string): Promise<number> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const version = await nextVersion(env, projectId);
    try {
      await run(env, `INSERT INTO builds (id, project_id, version, status) VALUES (?, ?, ?, 'building')`, buildId, projectId, version);
      return version;
    } catch {
      // Likely a UNIQUE(project_id, version) race — recompute and retry.
    }
  }
  throw new BadRequest('Could not reserve a build version; please retry.');
}

export async function generateBuild(env: Env, projectId: string, themeOverride?: string): Promise<BuildResult> {
  await requireProject(env, projectId);
  const spec = await assembleSpec(env, projectId, themeOverride);
  return finalizeBuild(env, projectId, spec);
}

async function requireProject(env: Env, projectId: string) {
  const p = await one<{ id: string }>(env, 'SELECT id FROM projects WHERE id = ?', projectId);
  if (!p) throw new NotFound('project');
  return p;
}

function contentTypeFor(path: string): string {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.js')) return 'text/javascript';
  return 'application/octet-stream';
}
