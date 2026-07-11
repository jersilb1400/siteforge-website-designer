import { describe, it, expect } from 'vitest';
import { buildImagePrompts, buildImagePromptsForSlots } from '../src/generate/images/prompts';
import { imageModel } from '../src/lib/config';
import type { Env } from '../src/types';
import { selectRecipe, RECIPES } from '../src/generate/composition';
import { applyCritiqueFixes, critiqueBuild } from '../src/generate/critique';
import type { SiteSpec } from '../src/generate/spec';
import { resolvePalette } from '../src/generate/palette';
import { getDemoSeed } from '../src/generate/demo/catalog';

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

  it('builds prompts for exact composition slots', () => {
    const recipe = selectRecipe({ industry: 'Day spa / Salon', themeId: 'haven' });
    const prompts = buildImagePromptsForSlots(
      { businessName: 'Aura', industry: 'Day spa / Salon', themeId: 'haven' },
      recipe.imageSlots,
    );
    expect(prompts.length).toBe(recipe.imageSlots.length);
    expect(prompts[0]!.role).toBe('hero');
    expect(prompts.some((p) => p.role === 'about')).toBe(true);
    expect(prompts.some((p) => p.role === 'service')).toBe(true);
  });
});

describe('composition recipes', () => {
  it('selects industry-native recipes', () => {
    expect(selectRecipe({ industry: 'Day spa / Salon', themeId: 'haven' }).id).toBe('editorial-luxury');
    expect(selectRecipe({ industry: 'Church / Ministry' }).id).toBe('reverent-sanctuary');
    expect(selectRecipe({ industry: 'Restaurant / Cafe' }).id).toBe('warm-hospitality');
    expect(selectRecipe({ industry: 'Home & trade services' }).id).toBe('craft-trade');
  });

  it('has six curated recipes with image slots', () => {
    expect(RECIPES).toHaveLength(6);
    expect(RECIPES.every((r) => r.imageSlots.length >= 6)).toBe(true);
  });

  it('demo seeds pin a recipeId for structural uniqueness', () => {
    expect(getDemoSeed('Day spa / Salon')!.recipeId).toBe('editorial-luxury');
    expect(getDemoSeed('Church / Ministry')!.recipeId).toBe('reverent-sanctuary');
    expect(getDemoSeed('Restaurant / Cafe')!.recipeId).toBe('warm-hospitality');
    expect(getDemoSeed('Home & trade services')!.recipeId).toBe('craft-trade');
    expect(getDemoSeed('Professional services (law, accounting, consulting)')!.recipeId).toBe('clean-clinic');
  });
});

describe('design critique fixes', () => {
  it('fixes weak CTA and Inter body font', async () => {
    const spec: SiteSpec = {
      projectId: 'p',
      themeId: 'haven',
      business: { name: 'Aura', tagline: 't', industry: 'Day spa / Salon', tone: 'Warm', story: 's' },
      contact: { email: '', phone: '', address: '', hours: '', socials: {} },
      sections: [{ id: 'home', label: 'Home', file: 'index.html', href: 'index.html' }],
      palette: resolvePalette({ brandColors: '#3e5245' }),
      images: [{ src: 'media/0.jpg', alt: 'x' }],
      content: {
        heroHeadline: 'Aura',
        heroSub: 'Welcome to Aura',
        heroCtaLabel: 'Learn more',
        heroCtaHref: 'contact.html',
        aboutTitle: 'A',
        aboutBody: ['b'],
        servicesTitle: 'S',
        services: [],
        highlights: [],
        ctaTitle: 'C',
        ctaBody: 'b',
      },
      design: {
        fontDisplay: 'x',
        fontBody: `'Inter', system-ui, sans-serif`,
        fontHref: 'https://fonts.googleapis.com/css2?family=Inter&display=swap',
        signatureCss: '',
      },
      generatedAt: new Date().toISOString(),
    };
    const critique = await critiqueBuild({} as Env, spec, '<html><body class="sf-hero"></body></html>');
    expect(critique.pass).toBe(false);
    const fixed = applyCritiqueFixes(spec, critique);
    expect(fixed.content.heroCtaLabel).not.toMatch(/learn more/i);
    expect(fixed.content.heroSub).not.toMatch(/^Welcome to/i);
    expect(fixed.design?.fontBody).not.toMatch(/Inter/i);
    expect(fixed.composition?.recipeId).toBeTruthy();
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
