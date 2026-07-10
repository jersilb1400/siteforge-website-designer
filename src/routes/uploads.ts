import { Hono } from 'hono';
import type { Env, Vars } from '../types';
import { one, run } from '../lib/db';
import { id } from '../lib/id';
import { BadRequest, NotFound } from '../lib/errors';
import { requireOperator } from '../middleware/auth';

// Operator uploads of client-provided logo + photos. Bytes go to R2; rows are
// auto-confirmed (the operator is the gate — these are customer-supplied, not
// scraped). Generation prefers uploads over stock/scraped images and places
// logos in the site nav.

export const uploads = new Hono<{ Bindings: Env; Variables: Vars }>();
uploads.use('*', requireOperator);

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 12;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);

function extFor(mime: string): string {
  return (
    {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
    }[mime] || 'bin'
  );
}

async function projectOrThrow(env: Env, projectId: string) {
  const p = await one<{ id: string; name: string }>(env, 'SELECT id, name FROM projects WHERE id = ?', projectId);
  if (!p) throw new NotFound('project');
  return p;
}

function normalizeMime(file: File): string {
  const raw = (file.type || '').split(';')[0]!.trim().toLowerCase();
  if (raw && ALLOWED.has(raw)) return raw;
  // Some browsers omit type for HEIC/etc — reject unknowns rather than guess wrong.
  const name = file.name.toLowerCase();
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.svg')) return 'image/svg+xml';
  return raw;
}

// POST /api/projects/:id/uploads — multipart form.
// Fields: kind = "logo" | "photo" (default photo); files in "file" or "files".
uploads.post('/projects/:id/uploads', async (c) => {
  const projectId = c.req.param('id');
  const project = await projectOrThrow(c.env, projectId);

  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    throw new BadRequest('Expected multipart form data.');
  }

  const kindRaw = String(form.get('kind') || 'photo').toLowerCase();
  const kind = kindRaw === 'logo' ? 'logo' : 'photo';
  const altDefault = String(form.get('alt') || '').trim();

  const files: File[] = [];
  for (const key of ['file', 'files', 'photo', 'photos', 'logo']) {
    for (const v of form.getAll(key)) {
      if (v instanceof File && v.size > 0) files.push(v);
    }
  }
  // Also accept any File values under other keys.
  for (const [, v] of form.entries()) {
    if (v instanceof File && v.size > 0 && !files.includes(v)) files.push(v);
  }

  if (!files.length) throw new BadRequest('Attach at least one image file (field: file or files).');
  if (kind === 'logo' && files.length > 1) {
    throw new BadRequest('Upload one logo at a time.');
  }
  if (files.length > MAX_FILES) throw new BadRequest(`At most ${MAX_FILES} files per upload.`);

  if (kind === 'logo') {
    // New logo replaces prior logos for this project.
    await run(
      c.env,
      `UPDATE assets SET review_status = 'rejected'
        WHERE project_id = ? AND kind = 'logo' AND review_status IN ('pending','confirmed','edited')`,
      projectId,
    );
  }

  const saved: Array<{
    id: string;
    kind: string;
    mimeType: string;
    bytes: number;
    altText: string;
    previewUrl: string;
    reviewStatus: string;
  }> = [];

  for (const file of files) {
    const mime = normalizeMime(file);
    if (!ALLOWED.has(mime)) {
      throw new BadRequest(`Unsupported type "${file.type || file.name}". Use JPEG, PNG, WebP, GIF, or SVG.`);
    }
    if (kind === 'photo' && mime === 'image/svg+xml') {
      throw new BadRequest('SVG is only allowed for logos, not photos.');
    }
    const max = kind === 'logo' ? MAX_LOGO_BYTES : MAX_PHOTO_BYTES;
    if (file.size > max) {
      throw new BadRequest(
        `${file.name || 'File'} is too large (${Math.round(file.size / 1024)} KB). Max ${Math.round(max / 1024)} KB.`,
      );
    }

    const buf = await file.arrayBuffer();
    if (!buf.byteLength) continue;

    const assetId = id('asset');
    const folder = kind === 'logo' ? 'logo' : 'uploads';
    const r2Key = `projects/${projectId}/${folder}/${assetId}.${extFor(mime)}`;
    await c.env.R2.put(r2Key, buf, { httpMetadata: { contentType: mime } });

    const alt =
      altDefault ||
      (kind === 'logo' ? `${project.name.replace(/^Demo — /, '')} logo` : file.name.replace(/\.[^.]+$/, '') || 'Photo');

    await run(
      c.env,
      `INSERT INTO assets (id, project_id, r2_key, kind, mime_type, source_url, alt_text, bytes, review_status)
       VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'confirmed')`,
      assetId,
      projectId,
      r2Key,
      kind === 'logo' ? 'logo' : 'image',
      mime,
      alt,
      buf.byteLength,
    );

    saved.push({
      id: assetId,
      kind: kind === 'logo' ? 'logo' : 'image',
      mimeType: mime,
      bytes: buf.byteLength,
      altText: alt,
      previewUrl: `/api/assets/${assetId}/file`,
      reviewStatus: 'confirmed',
    });
  }

  if (!saved.length) throw new BadRequest('No usable image data in the upload.');

  return c.json({ uploaded: saved, count: saved.length }, 201);
});

// GET /api/assets/:id/file — stream asset bytes from R2 (operator dashboard thumbs).
uploads.get('/assets/:id/file', async (c) => {
  const assetId = c.req.param('id');
  const row = await one<{ r2_key: string; mime_type: string | null }>(
    c.env,
    'SELECT r2_key, mime_type FROM assets WHERE id = ?',
    assetId,
  );
  if (!row) throw new NotFound('asset');
  const obj = await c.env.R2.get(row.r2_key);
  if (!obj) throw new NotFound('asset file');
  const headers = new Headers();
  headers.set('content-type', row.mime_type || obj.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('cache-control', 'private, max-age=3600');
  return new Response(obj.body, { headers });
});
