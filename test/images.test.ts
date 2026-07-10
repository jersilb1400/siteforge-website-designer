import { describe, it, expect } from 'vitest';
import { buildImagePrompts } from '../src/generate/images/prompts';
import { imageModel } from '../src/lib/config';
import type { Env } from '../src/types';

describe('image prompt pack', () => {
  it('builds hero-first prompts capped at the requested count', () => {
    const prompts = buildImagePrompts(
      {
        businessName: 'Aura Day Spa',
        industry: 'Day spa / Salon',
        tone: 'Warm',
        themeId: 'haven',
      },
      6,
    );
    expect(prompts).toHaveLength(6);
    expect(prompts[0]!.role).toBe('hero');
    expect(prompts[0]!.aspectRatio).toBe('16:9');
    expect(prompts[0]!.prompt).toMatch(/Aura Day Spa/);
    expect(prompts[0]!.prompt).toMatch(/No text/i);
    expect(prompts[0]!.prompt).toMatch(/sage|brass|editorial|cinematic/i);
    expect(prompts.slice(1).every((p) => p.aspectRatio === '4:3')).toBe(true);
  });

  it('returns empty when count is 0 and caps at 8', () => {
    expect(buildImagePrompts({ businessName: 'X', industry: 'Other' }, 0)).toHaveLength(0);
    expect(buildImagePrompts({ businessName: 'X', industry: 'Other' }, 20)).toHaveLength(8);
  });

  it('covers restaurant and church industries without throwing', () => {
    for (const industry of ['Restaurant / Cafe', 'Church / Ministry', 'Nonprofit']) {
      const p = buildImagePrompts({ businessName: 'Test', industry }, 3);
      expect(p[0]!.role).toBe('hero');
      expect(p.every((x) => x.prompt.length > 40)).toBe(true);
    }
  });
});

describe('image model config', () => {
  it('defaults to FLUX.2 Klein 4B', () => {
    expect(imageModel({} as Env)).toBe('black-forest-labs/flux.2-klein-4b');
    expect(imageModel({ OPENROUTER_IMAGE_MODEL: 'black-forest-labs/flux.2-pro' } as Env)).toBe(
      'black-forest-labs/flux.2-pro',
    );
  });
});
