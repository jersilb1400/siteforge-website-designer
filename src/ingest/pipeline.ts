import type { Env } from '../types';
import { run, one } from '../lib/db';
import { id } from '../lib/id';
import { renderPage, isAllowed } from './render';
import { extractFromHtml, type StructuredContent } from './extract';
import { downloadImages } from './assets';

// Orchestrates one ingestion job into a normalized `source_content` row with
// review_status='pending'. NOTHING here is auto-published: the client reviews
// and confirms every row before generation uses it (content-ethics gate).

type Confidence = 'high' | 'best_effort' | 'manual';

// Replace any still-pending row of this source type before writing a fresh one,
// so re-ingesting overwrites unreviewed data but never clobbers confirmed edits.
async function upsertSourceContent(
  env: Env,
  projectId: string,
  sourceType: string,
  sourceUrl: string | null,
  confidence: Confidence,
  data: unknown,
): Promise<string> {
  await run(
    env,
    `DELETE FROM source_content WHERE project_id = ? AND source_type = ? AND review_status = 'pending'`,
    projectId,
    sourceType,
  );
  const scId = id('src');
  await run(
    env,
    `INSERT INTO source_content (id, project_id, source_type, source_url, confidence, data_json, review_status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    scId,
    projectId,
    sourceType,
    sourceUrl,
    confidence,
    JSON.stringify(data),
  );
  return scId;
}

async function logJob(env: Env, projectId: string, kind: string, status: string, detail: unknown) {
  await run(
    env,
    `INSERT INTO job_log (id, project_id, kind, status, detail_json) VALUES (?, ?, ?, ?, ?)`,
    id('job'),
    projectId,
    kind,
    status,
    JSON.stringify(detail),
  );
}

// --- website: the primary, reliable path (client owns the site) ---
export async function ingestWebsite(env: Env, projectId: string, url: string): Promise<void> {
  const allowed = await isAllowed(url, /* ownedByClient */ true);
  if (!allowed) {
    await logJob(env, projectId, 'scrape', 'error', { url, reason: 'robots_disallow' });
    return;
  }

  const page = await renderPage(env, url);
  const content = await extractFromHtml(page.html, page.finalUrl);

  // Pull real images into R2 and annotate which were saved.
  const saved = await downloadImages(env, projectId, content.images);
  const savedByUrl = new Map(saved.map((a) => [a.sourceUrl, a.r2Key]));
  const enriched = {
    ...content,
    images: content.images.map((im) => ({ ...im, r2Key: savedByUrl.get(im.url) ?? null })),
    savedAssetCount: saved.length,
    renderedVia: page.via,
  };

  await upsertSourceContent(env, projectId, 'website', page.finalUrl, 'high', enriched);
  await logJob(env, projectId, 'scrape', 'done', {
    url: page.finalUrl,
    via: page.via,
    images: saved.length,
    emails: content.emails.length,
    phones: content.phones.length,
  });
}

// --- facebook: three honest tiers, degrade gracefully, never oversell ---
export async function ingestFacebook(env: Env, projectId: string, url: string): Promise<void> {
  // Tier (a) Graph API would require an app + the client connecting their page
  // (later phase). Tier (b) best-effort public scrape via the renderer. Tier
  // (c) manual fallback — prompt the client to paste their info.
  try {
    const allowed = await isAllowed(url, false);
    if (!allowed) throw new Error('robots_disallow');
    const page = await renderPage(env, url);
    const content = await extractFromHtml(page.html, page.finalUrl);
    // Public FB pages are heavily JS-gated; only trust OG-level fields.
    const usable = content.businessName || content.description || content.ogImage;
    if (!usable) throw new Error('no_usable_content');
    await upsertSourceContent(env, projectId, 'facebook', page.finalUrl, 'best_effort', {
      businessName: content.businessName,
      description: content.description,
      ogImage: content.ogImage,
      note: 'Best-effort public scrape — Facebook limits what is visible. Please confirm and fill gaps.',
    });
    await logJob(env, projectId, 'scrape', 'done', { url, tier: 'best_effort' });
  } catch (err) {
    // Tier (c): manual — create a pending row the client fills in themselves.
    await upsertSourceContent(env, projectId, 'facebook', url, 'manual', {
      note: 'Automatic Facebook import is unreliable. Please paste your About text and upload photos here.',
      manualFields: { about: '', hours: '', photos: [] },
    });
    await logJob(env, projectId, 'scrape', 'done', { url, tier: 'manual', reason: String(err) });
  }
}

// --- google business: best-effort public listing, else manual ---
export async function ingestGoogleBusiness(env: Env, projectId: string, query: string): Promise<void> {
  const looksLikeUrl = /^https?:\/\//i.test(query);
  try {
    if (!looksLikeUrl) throw new Error('needs_manual');
    const allowed = await isAllowed(query, false);
    if (!allowed) throw new Error('robots_disallow');
    const page = await renderPage(env, query);
    const content = await extractFromHtml(page.html, page.finalUrl);
    await upsertSourceContent(env, projectId, 'google_business', page.finalUrl, 'best_effort', {
      businessName: content.businessName,
      description: content.description,
      phones: content.phones,
      addresses: content.addresses,
      note: 'Best-effort scrape of the public listing. Confirm hours and reviews manually.',
    });
    await logJob(env, projectId, 'scrape', 'done', { query, tier: 'best_effort' });
  } catch (err) {
    await upsertSourceContent(env, projectId, 'google_business', looksLikeUrl ? query : null, 'manual', {
      query,
      note: 'Please confirm your Google Business hours, address, and add review highlights.',
      manualFields: { hours: '', address: '', reviewHighlights: [] },
    });
    await logJob(env, projectId, 'scrape', 'done', { query, tier: 'manual', reason: String(err) });
  }
}

// Convenience for the review API: does this project have a source row yet?
export async function hasSource(env: Env, projectId: string, sourceType: string): Promise<boolean> {
  const row = await one<{ id: string }>(
    env,
    `SELECT id FROM source_content WHERE project_id = ? AND source_type = ? LIMIT 1`,
    projectId,
    sourceType,
  );
  return !!row;
}
