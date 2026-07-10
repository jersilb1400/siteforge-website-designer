import type { Env } from '../../types';
import { run } from '../../lib/db';
import { id } from '../../lib/id';
import { photosForIndustry, type DemoPhoto } from './photos';

// Pull curated demo photos into R2 and mark them confirmed so finalizeBuild
// can publish them. Failures are skipped (best-effort) so a flaky CDN never
// blocks a demo — but we try hard to land at least a hero + gallery set.

const MAX_BYTES = 6 * 1024 * 1024;
const UA = 'SiteForgeBot/0.1 (+https://siteforge.dev/bot)';

function extFor(mime: string): string {
  return (
    { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[mime] || 'jpg'
  );
}

export async function ingestDemoPhotos(
  env: Env,
  projectId: string,
  industry: string,
  businessName: string,
): Promise<number> {
  const photos = photosForIndustry(industry);
  let saved = 0;
  for (const photo of photos) {
    const ok = await putConfirmedImage(env, projectId, photo, businessName);
    if (ok) saved++;
  }
  return saved;
}

async function putConfirmedImage(
  env: Env,
  projectId: string,
  photo: DemoPhoto,
  businessName: string,
): Promise<boolean> {
  try {
    const res = await fetch(photo.url, {
      headers: { 'user-agent': UA, accept: 'image/*,*/*;q=0.8' },
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0]!.trim().toLowerCase();
    if (!mime.startsWith('image/')) return false;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return false;

    const assetId = id('asset');
    const r2Key = `projects/${projectId}/demo/${assetId}.${extFor(mime)}`;
    await env.R2.put(r2Key, buf, { httpMetadata: { contentType: mime } });
    await run(
      env,
      `INSERT INTO assets (id, project_id, r2_key, kind, mime_type, source_url, alt_text, bytes, review_status)
       VALUES (?, ?, ?, 'image', ?, ?, ?, ?, 'confirmed')`,
      assetId,
      projectId,
      r2Key,
      mime,
      photo.url,
      photo.alt || `${businessName} photo`,
      buf.byteLength,
    );
    return true;
  } catch (err) {
    console.warn('demo photo skipped', { url: photo.url, err: String(err) });
    return false;
  }
}
