import { imageModel } from './config';
import type { Env } from '../types';

// Thin OpenRouter Images API client. Used to generate site photography when
// a project lacks enough confirmed uploads/scrapes. See ADR-0016/0019.

const OR_IMAGES = 'https://openrouter.ai/api/v1/images';

export interface GenerateImageInput {
  prompt: string;
  /** Preferred aspect; providers may clamp. */
  aspectRatio?: '16:9' | '4:3' | '3:2' | '1:1';
  /** Resolution tier when supported (FLUX Klein may ignore). */
  resolution?: '1K' | '2K';
  model?: string;
}

export interface GeneratedImage {
  bytes: ArrayBuffer;
  mimeType: string;
  costUsd?: number;
  model: string;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  // Strip data-URL prefix if a provider returns one.
  const raw = b64.includes(',') ? b64.slice(b64.indexOf(',') + 1) : b64;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Generate one image via OpenRouter. Returns bytes + mime, or throws
 * OpenRouterError. Caller is responsible for cost caps / fallbacks.
 */
export async function generateImage(env: Env, input: GenerateImageInput): Promise<GeneratedImage> {
  const key = env.OPENROUTER_API_KEY;
  if (!key) throw new OpenRouterError('OPENROUTER_API_KEY is not configured.');

  const model = input.model || imageModel(env);
  const body: Record<string, unknown> = {
    model,
    prompt: input.prompt,
    output_format: 'jpeg',
  };
  if (input.aspectRatio) body.aspect_ratio = input.aspectRatio;
  if (input.resolution) body.resolution = input.resolution;

  const res = await fetch(OR_IMAGES, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      'http-referer': 'https://websiteforge.cc',
      'x-title': 'SiteForge',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new OpenRouterError(
      `OpenRouter image failed (${res.status}): ${text.slice(0, 240) || res.statusText}`,
      res.status,
    );
  }

  const json = (await res.json()) as {
    data?: Array<{ b64_json?: string; media_type?: string }>;
    usage?: { cost?: number };
    error?: { message?: string };
  };

  if (json.error?.message) throw new OpenRouterError(json.error.message);
  const first = json.data?.[0];
  if (!first?.b64_json) throw new OpenRouterError('OpenRouter returned no image data.');

  const mimeType = first.media_type || 'image/jpeg';
  const bytes = b64ToArrayBuffer(first.b64_json);
  if (!bytes.byteLength) throw new OpenRouterError('OpenRouter returned empty image bytes.');

  return {
    bytes,
    mimeType,
    costUsd: typeof json.usage?.cost === 'number' ? json.usage.cost : undefined,
    model,
  };
}
