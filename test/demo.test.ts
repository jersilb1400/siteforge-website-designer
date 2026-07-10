import { describe, it, expect } from 'vitest';
import {
  buildDemoAnswers,
  buildDemoSourceData,
  getDemoSeed,
  isDemoIndustry,
  listDemoIndustries,
} from '../src/generate/demo/catalog';
import { buildProfile } from '../src/interview/engine';
import { pagesForIndustry } from '../src/interview/questions';
import { selectTheme, themeExists, THEMES } from '../src/generate/themes';
import { generateContent } from '../src/generate/content';
import { sectionsForPages } from '../src/generate/spec';
import { renderSite } from '../src/generate/render';
import { resolvePalette } from '../src/generate/palette';
import type { SiteSpec } from '../src/generate/spec';
import type { Env } from '../src/types';

describe('Day spa / Salon industry + haven theme', () => {
  it('is in the interview industry list and has page defaults', () => {
    const pages = pagesForIndustry('Day spa / Salon');
    expect(pages).toContain('Services');
    expect(pages).toContain('Book');
    expect(pages).toContain('Gallery');
  });

  it('auto-selects the haven theme', () => {
    expect(themeExists('haven')).toBe(true);
    expect(selectTheme('Day spa / Salon', 'Warm').id).toBe('haven');
  });

  it('keeps industry claims mutually exclusive including haven', () => {
    const seen = new Set<string>();
    for (const t of THEMES) {
      for (const ind of t.suits.industries ?? []) {
        expect(seen.has(ind)).toBe(false);
        seen.add(ind);
      }
    }
    expect(seen.has('Day spa / Salon')).toBe(true);
  });
});

describe('demo catalog', () => {
  it('covers every listed industry with a seed', () => {
    const list = listDemoIndustries();
    expect(list.length).toBeGreaterThanOrEqual(9);
    expect(list.some((i) => i.industry === 'Day spa / Salon')).toBe(true);
    for (const item of list) {
      expect(isDemoIndustry(item.industry)).toBe(true);
      const seed = getDemoSeed(item.industry);
      expect(seed).toBeTruthy();
      expect(seed!.services.length).toBeGreaterThanOrEqual(4);
      expect(seed!.themeId).toBeTruthy();
    }
  });

  it('builds a profile-ready answer map for a spa demo', () => {
    const seed = getDemoSeed('Day spa / Salon')!;
    const answers = buildDemoAnswers(
      { businessName: 'Aura Day Spa', industry: 'Day spa / Salon', city: 'Austin, TX' },
      seed,
    );
    const profile = buildProfile(answers);
    expect(profile.business.name).toBe('Aura Day Spa');
    expect(profile.business.industry).toBe('Day spa / Salon');
    expect(profile.pages).toEqual(seed.pages);
    expect(profile.goals).toContain('Take bookings or appointments');
    expect(profile.contact.address).toBe('Austin, TX');
    expect(profile.contact.hours).toBe(seed.hours);
  });

  it('seeds confirmed source data with real services', () => {
    const seed = getDemoSeed('Day spa / Salon')!;
    const data = buildDemoSourceData({ businessName: 'Aura Day Spa', industry: 'Day spa / Salon' }, seed);
    expect(data.demo).toBe(true);
    expect(data.services[0]!.name).toBe('Signature Facial');
    expect(data.headings).toContain('Hot Stone Massage');
  });
});

describe('demo content generation (no Anthropic)', () => {
  const env = { ANTHROPIC_API_KEY: undefined } as unknown as Env;

  it('uses seeded services and brand-first hero for spa demos', async () => {
    const seed = getDemoSeed('Day spa / Salon')!;
    const answers = buildDemoAnswers(
      {
        businessName: 'Aura Day Spa',
        industry: 'Day spa / Salon',
        tagline: 'Quiet luxury for skin & soul',
        blurb: 'A calm retreat in the heart of the city.',
      },
      seed,
    );
    const profile = buildProfile(answers);
    const source = buildDemoSourceData(
      { businessName: 'Aura Day Spa', industry: 'Day spa / Salon', blurb: 'A calm retreat in the heart of the city.' },
      seed,
    );
    const content = await generateContent(env, {
      profile,
      confirmed: {
        about: source.about,
        description: source.description,
        headings: source.headings,
        hours: source.hours,
        services: source.services,
        servicesTitle: source.servicesTitle,
        highlights: source.highlights,
        ctaLabel: source.ctaLabel,
        demo: true,
      },
    });

    expect(content.heroHeadline).toBe('Aura Day Spa');
    expect(content.heroSub).toMatch(/calm retreat/i);
    expect(content.heroCtaLabel).toBe('Book an appointment');
    expect(content.services.map((s) => s.name)).toContain('Signature Facial');
    expect(content.servicesTitle).toBe('Rituals & services');
    expect(content.highlights.length).toBeGreaterThan(0);
  });

  it('never uses interview goals as service names', async () => {
    const seed = getDemoSeed('Day spa / Salon')!;
    const answers = buildDemoAnswers({ businessName: '21Edge', industry: 'Day spa / Salon' }, seed);
    const profile = buildProfile(answers);
    // Simulate a bad scrape path with no services — only goals available.
    const content = await generateContent(env, {
      profile,
      confirmed: { demo: false, headings: ['Generate leads / inquiries', 'Take bookings or appointments'] },
    });
    expect(content.services.every((s) => !/generate leads|take bookings/i.test(s.name))).toBe(true);
    expect(content.services[0]!.name).toMatch(/Facial|Massage|Hair|Nail|Core|Consult/i);
  });

  it('cleans pipe-junk taglines', async () => {
    const { cleanCopy } = await import('../src/generate/content');
    expect(cleanCopy('|Beauty with an edge| Cut sharp.')).toBe('Beauty with an edge · Cut sharp.');
    expect(cleanCopy('21Edge, Winnsboro. 769 likes · 75 talking about this')).toMatch(/^21Edge/);
    expect(cleanCopy('21Edge, Winnsboro. 769 likes · 75 talking about this')).not.toMatch(/likes/i);
  });

  it('renders a haven spa demo with brand-level h1, gallery hooks, and no lorem', async () => {
    const seed = getDemoSeed('Day spa / Salon')!;
    const answers = buildDemoAnswers({ businessName: 'Lumen Salon', industry: 'Day spa / Salon' }, seed);
    const profile = buildProfile(answers);
    const source = buildDemoSourceData({ businessName: 'Lumen Salon', industry: 'Day spa / Salon' }, seed);
    const content = await generateContent(env, {
      profile,
      confirmed: { ...source, demo: true },
    });
    const palette = resolvePalette({
      brandColors: seed.brandColors,
      generatePalette: false,
      tone: seed.tone,
    });
    const spec: SiteSpec = {
      projectId: 'proj_demo',
      themeId: 'haven',
      business: {
        name: profile.business.name,
        tagline: profile.business.tagline,
        industry: profile.business.industry,
        tone: profile.tone,
        story: profile.business.story,
      },
      contact: { ...profile.contact, socials: {} },
      sections: sectionsForPages(profile.pages),
      palette,
      images: [
        { src: 'media/0.jpg', alt: 'Spa room' },
        { src: 'media/1.jpg', alt: 'Massage' },
        { src: 'media/2.jpg', alt: 'Salon' },
      ],
      content,
      generatedAt: new Date().toISOString(),
    };
    const { files } = renderSite(spec);
    const html = files['index.html']!;
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(['index.html', 'services.html', 'about.html', 'gallery.html', 'contact.html']),
    );
    expect(html).toContain('Lumen Salon');
    expect(html).toMatch(/<h1[^>]*>Lumen Salon<\/h1>/);
    expect(html).toContain('href="services.html"');
    expect(html).toContain('sf-hero--has-photo');
    expect(html).toContain('sf-hero-media--bleed');
    expect(html).toContain('sf-teasers');
    expect(html).toContain('media/0.jpg');
    expect(files['services.html']).toContain('Signature Facial');
    expect(files['services.html']).toContain('sf-page-hero');
    expect(files['gallery.html']).toContain('sf-gallery');
    expect(html.toLowerCase()).not.toContain('lorem ipsum');
    expect(html).toContain('Cormorant');
    expect(html).toContain('sf-haven-rise');
  });
});

describe('demo photo packs', () => {
  it('provides spa photos for Day spa / Salon', async () => {
    const { photosForIndustry } = await import('../src/generate/demo/photos');
    const photos = photosForIndustry('Day spa / Salon');
    expect(photos.length).toBeGreaterThanOrEqual(8);
    expect(photos[0]!.url).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });
});
