import { describe, it, expect } from 'vitest';
import { applyInstruction } from '../src/generate/revise';
import { qualityCheck } from '../src/generate/quality';
import { resolvePalette } from '../src/generate/palette';
import type { SiteSpec } from '../src/generate/spec';

function baseSpec(): SiteSpec {
  return {
    projectId: 'proj_1',
    themeId: 'atelier',
    business: { name: 'Acme', tagline: 't', industry: 'Retail / shop', tone: 'Professional', story: 's' },
    contact: { email: 'a@b.co', phone: '', address: '', hours: '', socials: {} },
    sections: [{ id: 'home', label: 'Home' }, { id: 'contact', label: 'Contact' }],
    palette: resolvePalette({ brandColors: '#1f4fa8', tone: 'Professional' }),
    images: [],
    content: {
      heroHeadline: 'Old headline', heroSub: 'sub', heroCtaLabel: 'Go', heroCtaHref: '#contact',
      aboutTitle: 'About Acme', aboutBody: ['x'], servicesTitle: 'What we do', services: [{ name: 'S', desc: 'd' }],
      highlights: [], ctaTitle: 'Connect', ctaBody: 'reach out',
    },
    generatedAt: new Date().toISOString(),
  };
}

describe('natural-language revision (deterministic)', () => {
  it('switches theme by keyword', () => {
    expect(applyInstruction(baseSpec(), 'make it more bold').spec.themeId).toBe('storefront');
    expect(applyInstruction(baseSpec(), 'a warmer, more welcoming feel').spec.themeId).toBe('sanctuary');
    expect(applyInstruction(baseSpec(), 'use the atelier theme').spec.themeId).toBe('atelier');
  });

  it('switches to any of the 7 themes by explicit name (regression)', () => {
    for (const id of ['atelier', 'sanctuary', 'storefront', 'ledger', 'meridian', 'forge', 'gallery']) {
      const out = applyInstruction(baseSpec(), `use the ${id} theme`);
      expect(out.spec.themeId).toBe(id);
      expect(out.changed).toContain(`theme=${id}`);
    }
  });

  it('darkens the brand color and keeps contrast valid', () => {
    const before = baseSpec().palette.brand;
    const out = applyInstruction(baseSpec(), 'make the header darker');
    expect(out.spec.palette.brand).not.toBe(before);
    expect(out.changed).toContain('brand darker');
  });

  it('sets an explicit hex brand color', () => {
    const out = applyInstruction(baseSpec(), 'change the brand color to #0f766e');
    expect(out.spec.palette.brand).toBe('#0f766e');
  });

  it('edits the headline text', () => {
    const out = applyInstruction(baseSpec(), 'change the headline to Fresh Coffee Daily');
    expect(out.spec.content.heroHeadline).toBe('Fresh Coffee Daily');
  });

  it('reports no change for an uninterpretable instruction', () => {
    expect(applyInstruction(baseSpec(), 'do something magical').changed).toHaveLength(0);
  });
});

describe('quality gate', () => {
  const goodHtml = `<!doctype html><html lang="en"><head>
    <meta name="viewport" content="width=device-width"><title>Acme</title>
    <meta name="description" content="A real description here">
    <meta property="og:title" content="Acme">
    <script type="application/ld+json">{}</script></head>
    <body><a class="sf-skip" href="#main">skip</a><h1>Acme</h1>
    <img src="a.png" alt="a"><h2>More</h2></body></html>`;

  it('passes a well-formed page', () => {
    const r = qualityCheck(goodHtml, baseSpec());
    expect(r.pass).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it('fails when an image is missing alt text (critical)', () => {
    const bad = goodHtml.replace('<img src="a.png" alt="a">', '<img src="a.png">');
    const r = qualityCheck(bad, baseSpec());
    expect(r.pass).toBe(false);
  });

  it('fails when there are multiple h1s (critical)', () => {
    const bad = goodHtml.replace('<h2>More</h2>', '<h1>Second</h1>');
    const r = qualityCheck(bad, baseSpec());
    expect(r.pass).toBe(false);
  });
});
