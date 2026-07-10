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
import { qualityCheckBundle } from './quality';
import { deriveDesign } from './design-director';
import { ensureProjectPhotos } from './images/generate-assets';
import { getRecipe, selectRecipe, resolveComposition } from './composition';
import type { ImageRole } from './images/prompts';
import { critiqueBuild, applyCritiqueFixes } from './critique';

// Orchestrates a build: interview profile + CONFIRMED source content -> spec ->
// rendered, self-contained bundle in R2 -> versioned `builds` row.

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
    testimonials?: Array<{ quote: string; attribution: string }>;
    faq?: Array<{ q: string; a: string }>;
    team?: Array<{ name: string; role: string; bio?: string }>;
  } = {};
  for (const r of confirmed) {
    let d: any = {};
    try {
      d = JSON.parse(r.data_json);
    } catch {
      /* ignore */
    }
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
    if (!out.testimonials && Array.isArray(d.testimonials)) out.testimonials = d.testimonials;
    if (!out.faq && Array.isArray(d.faq)) out.faq = d.faq;
    if (!out.team && Array.isArray(d.team)) out.team = d.team;
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

const ROLE_ORDER: ImageRole[] = ['hero', 'about', 'service', 'service', 'service', 'gallery', 'gallery', 'atmosphere'];

function roleFromSourceUrl(sourceUrl: string | null): ImageRole | undefined {
  if (!sourceUrl) return undefined;
  const m = /openrouter:[^:]+:(\w+)/i.exec(sourceUrl);
  if (!m) return undefined;
  const role = m[1]!.toLowerCase();
  if (role === 'hero' || role === 'about' || role === 'service' || role === 'gallery' || role === 'atmosphere') {
    return role;
  }
  return undefined;
}

function assignRoles(images: SiteImage[], sourceRoles: Array<ImageRole | undefined>): SiteImage[] {
  const out: SiteImage[] = images.map((im, i) => ({
    ...im,
    role: sourceRoles[i] || undefined,
  }));
  let slot = 0;
  for (let i = 0; i < out.length; i++) {
    if (out[i]!.role) continue;
    const role = ROLE_ORDER[Math.min(slot, ROLE_ORDER.length - 1)]!;
    // Skip hero slot if already assigned
    if (role === 'hero' && out.some((im) => im.role === 'hero')) {
      slot++;
      out[i] = { ...out[i]!, role: ROLE_ORDER[Math.min(slot, ROLE_ORDER.length - 1)]! };
    } else {
      out[i] = { ...out[i]!, role };
    }
    slot++;
  }
  if (!out.some((im) => im.role === 'hero') && out[0]) {
    out[0] = { ...out[0], role: 'hero' };
  }
  return out;
}

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

  const design = await deriveDesign(
    env,
    {
      name: profile.business.name,
      industry: profile.business.industry,
      tone: profile.tone,
      story: profile.business.story,
      demo: !!merged.demo,
    },
    theme,
  );

  const recipe = design?.composition
    ? getRecipe(design.recipeId)
    : selectRecipe({
        industry: profile.business.industry,
        tone: profile.tone,
        themeId: theme.id,
      });
  const composition = design?.composition ?? resolveComposition(recipe);

  const palette = resolvePalette({
    brandColors: design?.brand ? `${design.brand} ${design.accent ?? ''}` : profile.brand.colors,
    generatePalette: design?.brand ? false : profile.brand.generatePalette,
    scrapedPalette: merged.palette,
    tone: profile.tone,
  });

  const contentInputs: ContentInputs = {
    profile,
    confirmed: merged,
    allowInventedSocial: composition.allowInventedSocial && !!merged.demo,
    brandFirst: composition.brandFirst,
  };
  const content = await generateContent(env, contentInputs);

  return {
    projectId,
    themeId: theme.id,
    demo: !!merged.demo,
    composition,
    ...(design
      ? {
          design: {
            fontDisplay: design.fontDisplay,
            fontBody: design.fontBody,
            fontHref: design.fontHref,
            signatureCss: design.signatureCss,
            rationale: design.rationale,
          },
        }
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
    sections: sectionsForPages(profile.pages, recipe.extraPages),
    palette,
    images: [],
    content,
    generatedAt: new Date().toISOString(),
  };
}

export async function finalizeBuild(env: Env, projectId: string, spec: SiteSpec): Promise<BuildResult> {
  const buildId = id('build');
  const buildPrefix = `builds/${buildId}`;
  const version = await reserveBuild(env, projectId, buildId);

  try {
    const assetRows = await all<{
      id: string;
      r2_key: string;
      alt_text: string | null;
      kind: string;
      source_url: string | null;
    }>(
      env,
      `SELECT id, r2_key, alt_text, kind, source_url FROM assets
        WHERE project_id = ? AND review_status IN ('confirmed','edited')
        ORDER BY
          CASE WHEN kind = 'logo' THEN 0 ELSE 1 END,
          CASE
            WHEN r2_key LIKE '%/uploads/%' OR r2_key LIKE '%/logo/%' THEN 0
            WHEN r2_key LIKE '%/generated/%' OR IFNULL(source_url,'') LIKE 'openrouter:%' THEN 1
            ELSE 2
          END,
          created_at ASC
        LIMIT 16`,
      projectId,
    );

    const images: SiteImage[] = [];
    const sourceRoles: Array<ImageRole | undefined> = [];
    let logo: SiteImage | undefined;
    let i = 0;
    for (const a of assetRows) {
      const obj = await env.R2.get(a.r2_key);
      if (!obj) continue;
      const ext = a.r2_key.split('.').pop() || 'bin';
      if (a.kind === 'logo' && !logo) {
        const rel = `media/logo.${ext}`;
        await env.R2.put(`${buildPrefix}/${rel}`, await obj.arrayBuffer(), {
          httpMetadata: { contentType: obj.httpMetadata?.contentType || 'image/png' },
        });
        logo = { src: rel, alt: a.alt_text || `${spec.business.name} logo` };
        continue;
      }
      if (a.kind === 'logo') continue;
      if (images.length >= 12) continue;
      const rel = `media/${i}.${ext}`;
      await env.R2.put(`${buildPrefix}/${rel}`, await obj.arrayBuffer(), {
        httpMetadata: { contentType: obj.httpMetadata?.contentType || 'image/jpeg' },
      });
      // Uploads prefer hero when first.
      const isUpload = a.r2_key.includes('/uploads/');
      const parsed = roleFromSourceUrl(a.source_url);
      sourceRoles.push(parsed || (isUpload && images.length === 0 ? 'hero' : undefined));
      images.push({ src: rel, alt: a.alt_text || spec.business.name });
      i++;
    }
    spec = {
      ...spec,
      images: assignRoles(images, sourceRoles),
      logo,
      generatedAt: new Date().toISOString(),
    };

    let { files } = renderSite(spec);

    // Design critique + one fix pass (cost-capped).
    const homeHtml = files['index.html'] || '';
    let critique = await critiqueBuild(env, spec, homeHtml);
    if (!critique.pass) {
      spec = applyCritiqueFixes(spec, critique);
      ({ files } = renderSite(spec));
      critique = await critiqueBuild(env, spec, files['index.html'] || '');
    }

    for (const [path, body] of Object.entries(files)) {
      await env.R2.put(`${buildPrefix}/${path}`, body, { httpMetadata: { contentType: contentTypeFor(path) } });
    }

    const quality = qualityCheckBundle(files, spec);
    const lighthousePayload = { ...quality, designCritique: critique };

    const previewUrl = `/preview/${buildId}/`;
    await run(
      env,
      `UPDATE builds SET status='ready', theme_id=?, bundle_r2_key=?, preview_url=?, spec_json=?, lighthouse_json=?,
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      spec.themeId,
      buildPrefix,
      previewUrl,
      JSON.stringify(spec),
      JSON.stringify(lighthousePayload),
      buildId,
    );
    await run(env, `UPDATE projects SET status='preview', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, projectId);

    return { buildId, version, themeId: spec.themeId, previewUrl, quality: { score: quality.score, pass: quality.pass } };
  } catch (err) {
    await run(env, `UPDATE builds SET status='failed', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`, buildId).catch(
      () => {},
    );
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
      // UNIQUE race — retry
    }
  }
  throw new BadRequest('Could not reserve a build version; please retry.');
}

export async function generateBuild(env: Env, projectId: string, themeOverride?: string): Promise<BuildResult> {
  await requireProject(env, projectId);
  const spec = await assembleSpec(env, projectId, themeOverride);
  const recipe = getRecipe(spec.composition?.recipeId);
  await ensureProjectPhotos(
    env,
    projectId,
    {
      businessName: spec.business.name,
      industry: spec.business.industry,
      tone: spec.business.tone,
      themeId: spec.themeId,
      tagline: spec.business.tagline,
      recipeId: recipe.id,
    },
    { target: Math.max(6, recipe.imageSlots.length), allowStockFallback: true, slots: recipe.imageSlots },
  );
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
