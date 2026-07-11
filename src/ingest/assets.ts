import type { Env } from '../types';
import { run } from '../lib/db';
import { id } from '../lib/id';

// Download a bounded set of images to R2 and index them in the `assets` table.
// Guards keep a runaway page from filling storage: cap count and per-file size,
// accept only image content-types. R2 keys are namespaced per project.

const MAX_DOWNLOAD = 12;
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB/image
const UA = 'SiteForgeBot/0.1 (+https://siteforge.dev/bot)';

function extFor(mime: string): string {
  return (
    { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' }[
      mime
    ] || 'bin'
  );
}

export interface DownloadedAsset {
  id: string;
  r2Key: string;
  sourceUrl: string;
  alt?: string;
  bytes: number;
  mime: string;
}

/**
 * Fetch up to MAX_DOWNLOAD images, store bytes in R2, insert `assets` rows.
 * Individual failures are skipped (best-effort); returns what succeeded.
 */
export async function downloadImages(
  env: Env,
  projectId: string,
  images: Array<{ url: string; alt?: string }>,
): Promise<DownloadedAsset[]> {
  const seen = new Set<string>();
  const out: DownloadedAsset[] = [];

  for (const img of images) {
    if (out.length >= MAX_DOWNLOAD) break;
    if (seen.has(img.url)) continue;
    seen.add(img.url);

    try {
      const res = await fetch(img.url, { headers: { 'user-agent': UA } });
      if (!res.ok) continue;
      const mime = (res.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase();
      if (!mime.startsWith('image/')) continue;

      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) continue;

      const assetId = id('asset');
      const r2Key = `projects/${projectId}/scraped/${assetId}.${extFor(mime)}`;
      await env.R2.put(r2Key, buf, { httpMetadata: { contentType: mime } });
      await run(
        env,
        `INSERT INTO assets (id, project_id, r2_key, kind, mime_type, source_url, alt_text, bytes)
         VALUES (?, ?, ?, 'image', ?, ?, ?, ?)`,
        assetId,
        projectId,
        r2Key,
        mime,
        img.url,
        img.alt ?? null,
        buf.byteLength,
      );
      out.push({ id: assetId, r2Key, sourceUrl: img.url, alt: img.alt, bytes: buf.byteLength, mime });
    } catch (err) {
      console.warn('asset download skipped', { url: img.url, err: String(err) });
    }
  }
  return out;
}
