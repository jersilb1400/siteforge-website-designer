import type { Env } from '../../types';
import { one, run } from '../../lib/db';
import { id } from '../../lib/id';
import { generateImage, OpenRouterError } from '../../lib/openrouter';
import { ingestDemoPhotos } from '../demo/ingest-photos';
import { buildImagePrompts, type ImagePromptBrief } from './prompts';

// Ensure a project has enough confirmed photo assets for a polished multi-page
// site. Prefer OpenRouter FLUX generation; fall back to Unsplash packs.
// Never blocks the build — failures are logged and skipped.

export const TARGET_PHOTOS = 6;
export const MAX_GENERATED = 8;

function extFor(mime: string): string {
  return (
    { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[mime] || 'jpg'
  );
}

/** Count confirmed non-logo image assets for a project. */
export async function countConfirmedPhotos(env: Env, projectId: string): Promise<number> {
  const row = await one<{ n: number }>(
    env,
    `SELECT COUNT(*) AS n FROM assets
      WHERE project_id = ?
        AND review_status IN ('confirmed','edited')
        AND kind != 'logo'`,
    projectId,
  );
  return row?.n ?? 0;
}

export interface EnsurePhotosResult {
  generated: number;
  stock: number;
  total: number;
  costUsd: number;
  source: 'openrouter' | 'unsplash' | 'existing' | 'mixed';
}

/**
 * Gap-fill photos up to `target`. Uses OpenRouter when keyed; otherwise
 * (or on failure) pulls Unsplash industry packs. Uploads/scrapes already
 * confirmed are left alone.
 */
export async function ensureProjectPhotos(
  env: Env,
  projectId: string,
  brief: ImagePromptBrief,
  opts: { target?: number; allowStockFallback?: boolean } = {},
): Promise<EnsurePhotosResult> {
  const target = opts.target ?? TARGET_PHOTOS;
  const allowStock = opts.allowStockFallback !== false;
  const existing = await countConfirmedPhotos(env, projectId);
  if (existing >= target) {
    return { generated: 0, stock: 0, total: existing, costUsd: 0, source: 'existing' };
  }

  const need = Math.min(MAX_GENERATED, target - existing);
  let generated = 0;
  let costUsd = 0;

  if (env.OPENROUTER_API_KEY && need > 0) {
    const prompts = buildImagePrompts(brief, need);
    for (const p of prompts) {
      try {
        const img = await generateImage(env, {
          prompt: p.prompt,
          aspectRatio: p.aspectRatio,
          resolution: '1K',
        });
        const assetId = id('asset');
        const r2Key = `projects/${projectId}/generated/${assetId}.${extFor(img.mimeType)}`;
        await env.R2.put(r2Key, img.bytes, { httpMetadata: { contentType: img.mimeType } });
        await run(
          env,
          `INSERT INTO assets (id, project_id, r2_key, kind, mime_type, source_url, alt_text, bytes, review_status)
           VALUES (?, ?, ?, 'image', ?, ?, ?, ?, 'confirmed')`,
          assetId,
          projectId,
          r2Key,
          img.mimeType,
          `openrouter:${img.model}:${p.role}`,
          p.alt,
          img.bytes.byteLength,
        );
        generated++;
        if (img.costUsd) costUsd += img.costUsd;
      } catch (err) {
        const msg = err instanceof OpenRouterError ? err.message : String(err);
        console.warn('openrouter image skipped', { projectId, role: p.role, err: msg });
        // Stop the OpenRouter loop on hard auth errors; otherwise continue.
        if (err instanceof OpenRouterError && (err.status === 401 || err.status === 402 || err.status === 403)) {
          break;
        }
      }
    }
    if (generated) {
      console.log('openrouter images saved', { projectId, generated, costUsd });
    }
  }

  let stock = 0;
  const afterGen = existing + generated;
  if (allowStock && afterGen < target) {
    const stillNeed = target - afterGen;
    stock = await ingestDemoPhotos(env, projectId, brief.industry, brief.businessName, stillNeed);
  }

  const total = await countConfirmedPhotos(env, projectId);
  const source: EnsurePhotosResult['source'] =
    generated && stock ? 'mixed' : generated ? 'openrouter' : stock ? 'unsplash' : 'existing';

  return { generated, stock, total, costUsd, source };
}
