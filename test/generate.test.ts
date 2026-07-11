import { describe, it, expect } from 'vitest';
import { resolvePalette, readableInk, luminance } from '../src/generate/palette';

// WCAG contrast ratio, mirrored here to assert AA compliance of resolved tokens.
function contrast(a: string, b: string): number {
  const [hi, lo] = luminance(a) > luminance(b) ? [luminance(a), luminance(b)] : [luminance(b), luminance(a)];
  return (hi + 0.05) / (lo + 0.05);
}
import { sectionsForPages } from '../src/generate/spec';
import { selectTheme, THEMES } from '../src/generate/themes';
import { jsonLdSafe, safeHref, esc } from '../src/generate/html';
import { resolveDesign, FONT_PAIRINGS, SIGNATURES } from '../src/generate/design-director';
import { renderSite } from '../src/generate/render';
import { resolvePalette as rp } from '../src/generate/palette';
import type { SiteSpec } from '../src/generate/spec';

describe('output safety (reviewer HIGH findings)', () => {
  it('jsonLdSafe neutralizes </script> breakout from scraped values', () => {
    const out = jsonLdSafe({ name: 'Evil</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('\\u003c');
    // Still valid JSON that round-trips to the original value.
    expect(JSON.parse(out).name).toBe('Evil</script><script>alert(1)</script>');
  });

  it('safeHref allows real schemes and blocks javascript:', () => {
    expect(safeHref('https://x.com')).toBe('https://x.com');
    expect(safeHref('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(safeHref('tel:+15550102020')).toBe('tel:+15550102020');
    expect(safeHref('#contact')).toBe('#contact');
    expect(safeHref('contact.html')).toBe('contact.html');
    expect(safeHref('services.html')).toBe('services.html');
    expect(safeHref('javascript:alert(1)')).toBe('#');
    expect(safeHref('  JavaScript:alert(1)')).toBe('#');
    expect(safeHref('data:text/html,x')).toBe('#');
  });

  it('esc escapes angle brackets and quotes for attributes/text', () => {
    expect(esc('<img src=x onerror=1>')).toBe('&lt;img src=x onerror=1&gt;');
    expect(esc(`"'&`)).toBe('&quot;&#39;&amp;');
  });
});

describe('palette resolution', () => {
  it('uses explicit hex codes from the interview (brand kept raw for backgrounds)', () => {
    const p = resolvePalette({ brandColors: '#0f766e and gold #f59e0b' });
    expect(p.brand).toBe('#0f766e');
  });

  it('adjusts text-role colors (link/accent) to meet WCAG AA on the background', () => {
    const p = resolvePalette({ brandColors: '#0f766e and gold #f59e0b' });
    expect(contrast(p.link, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.accent, p.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('forces the tone default when generatePalette is set', () => {
    const p = resolvePalette({ brandColors: '#0f766e', generatePalette: true, tone: 'Bold' });
    expect(p.brand).not.toBe('#0f766e');
  });

  it('falls back to a scraped brand color, skipping near-white/black', () => {
    const p = resolvePalette({ scrapedPalette: ['#ffffff', '#1a1a1a', '#7c2d3a'] });
    expect(p.brand).toBe('#7c2d3a');
  });

  it('picks readable ink for contrast', () => {
    expect(readableInk('#111318')).toBe('#ffffff');
    expect(readableInk('#f8f9fb')).toBe('#111318');
    expect(luminance('#ffffff')).toBeGreaterThan(luminance('#000000'));
  });
});

describe('section mapping', () => {
  it('always begins with home and ends with contact, with file hrefs', () => {
    const s = sectionsForPages(['Menu', 'Gallery']);
    expect(s[0]?.id).toBe('home');
    expect(s[0]?.file).toBe('index.html');
    expect(s.at(-1)?.id).toBe('contact');
    expect(s.at(-1)?.href).toBe('contact.html');
    expect(s.find((x) => x.id === 'services')?.file).toBe('services.html');
  });

  it('collapses synonymous pages to one section', () => {
    const ids = sectionsForPages(['Menu', 'Services', 'Ministries']).map((x) => x.id);
    expect(ids.filter((i) => i === 'services').length).toBe(1);
  });
});

describe('multi-page render', () => {
  function multiSpec(): SiteSpec {
    return {
      projectId: 'p',
      themeId: 'haven',
      composition: {
        recipeId: 'editorial-luxury',
        layoutVariant: 'editorial-luxury',
        hero: 'full-bleed',
        brandFirst: true,
        homeTeasers: ['services', 'testimonials', 'about', 'gallery'],
        stickyCta: true,
        secondaryCta: 'services',
        allowInventedSocial: true,
      },
      business: { name: 'Aura', tagline: 'Quiet luxury', industry: 'Day spa / Salon', tone: 'Warm', story: 'A calm retreat.' },
      contact: { email: '', phone: '', address: 'Austin', hours: 'Tue–Sat 9–7', socials: {} },
      sections: sectionsForPages(['Home', 'Services', 'About', 'Gallery', 'Contact'], [{ id: 'faq', label: 'FAQ' }]),
      palette: rp({ brandColors: '#3e5245', tone: 'Warm' }),
      images: [
        { src: 'media/0.jpg', alt: 'Hero', role: 'hero' },
        { src: 'media/1.jpg', alt: 'Massage', role: 'service' },
        { src: 'media/2.jpg', alt: 'Salon', role: 'service' },
        { src: 'media/3.jpg', alt: 'Facial', role: 'gallery' },
      ],
      content: {
        heroHeadline: 'Aura',
        heroSub: 'A calm retreat.',
        heroCtaLabel: 'Book your ritual',
        heroCtaHref: 'contact.html',
        secondaryCtaLabel: 'Explore rituals',
        trustLine: 'Quiet rooms · Skilled hands',
        aboutTitle: 'About Aura',
        aboutBody: ['A calm retreat for skin and body.'],
        servicesTitle: 'Rituals & services',
        services: [
          { name: 'Signature Facial', desc: 'Custom glow.' },
          { name: 'Hot Stone Massage', desc: 'Warm stones.' },
        ],
        highlights: ['Licensed therapists'],
        ctaTitle: 'Reserve your time at Aura',
        ctaBody: 'Visit us in Austin.',
        testimonials: [{ quote: 'Restored.', attribution: 'Maya R.' }],
        faq: [{ q: 'How do I book?', a: 'Use the book button.' }],
      },
      generatedAt: new Date().toISOString(),
    };
  }

  it('emits one HTML file per nav page with path-based nav', () => {
    const { files } = renderSite(multiSpec());
    expect(files['index.html']).toBeTruthy();
    expect(files['services.html']).toBeTruthy();
    expect(files['about.html']).toBeTruthy();
    expect(files['gallery.html']).toBeTruthy();
    expect(files['contact.html']).toBeTruthy();
    expect(files['faq.html']).toBeTruthy();
    const home = files['index.html']!;
    expect(home).toContain('href="services.html"');
    expect(home).not.toMatch(/href="#services"/);
    // editorial-luxury recipe renders spread layout instead of card teasers
    expect(home).toContain('sf-editorial-spread');
    expect(home).toContain('sf-hero--editorial-panel');
    expect(home).toContain('Book your ritual');
    expect(home).not.toContain('>Learn more<');
    expect(home).toContain('sf-testimonials');
    expect(home).toContain('sf-sticky-cta');
    expect(files['services.html']).toContain('sf-page-hero');
    expect(files['services.html']).toContain('Signature Facial');
    expect(files['gallery.html']).toContain('media/');
    expect(files['about.html']).toContain('sf-about--split');
    expect(files['faq.html']).toContain('sf-faq');
  });
});

describe('design director (guardrailed)', () => {
  it('resolves a valid pick from the curated pools', () => {
    const d = resolveDesign({
      fontPairing: 'editorial',
      signature: 'accent-rule',
      brand: '#0F766E',
      accent: '#F59E0B',
      rationale: 'x',
      industry: 'Day spa / Salon',
      themeId: 'haven',
    });
    expect(d).not.toBeNull();
    expect(d!.fontDisplay).toBe(FONT_PAIRINGS['editorial']!.display);
    expect(d!.signatureCss).toBe(SIGNATURES['accent-rule']!);
    expect(d!.brand).toBe('#0f766e'); // lowercased + validated
    expect(d!.composition?.recipeId).toBe('editorial-luxury');
    expect(d!.fontBody).not.toMatch(/Inter/i);
  });

  it('rejects an unknown font pairing (no arbitrary CSS/fonts)', () => {
    expect(resolveDesign({ fontPairing: 'comic-sans-deluxe', signature: 'accent-rule' })).toBeNull();
  });

  it('drops invalid hex colors and unknown signatures rather than injecting them', () => {
    const d = resolveDesign({ fontPairing: 'grotesque', signature: 'evil{}</style>', brand: 'red; }', accent: '#zzzzzz' });
    expect(d).not.toBeNull();
    expect(d!.brand).toBeUndefined();
    expect(d!.accent).toBeUndefined();
    expect(d!.signatureCss).toBe(''); // unknown signature -> empty, not injected
  });
});

describe('design override reaches the rendered HTML', () => {
  function specWithDesign(): SiteSpec {
    return {
      projectId: 'p', themeId: 'storefront',
      business: { name: 'Acme', tagline: 't', industry: 'Retail / shop', tone: 'Bold', story: 's' },
      contact: { email: 'a@b.co', phone: '', address: '', hours: '', socials: {} },
      sections: [
        { id: 'home', label: 'Home', file: 'index.html', href: 'index.html' },
        { id: 'contact', label: 'Contact', file: 'contact.html', href: 'contact.html' },
      ],
      palette: rp({ brandColors: '#1f4fa8', tone: 'Bold' }),
      images: [], content: {
        heroHeadline: 'H', heroSub: 'S', heroCtaLabel: 'Go', heroCtaHref: 'contact.html',
        aboutTitle: 'About', aboutBody: ['x'], servicesTitle: 'What', services: [{ name: 's', desc: 'd' }],
        highlights: [], ctaTitle: 'C', ctaBody: 'b',
      },
      design: {
        fontDisplay: FONT_PAIRINGS['elegant']!.display,
        fontBody: FONT_PAIRINGS['elegant']!.body,
        fontHref: FONT_PAIRINGS['elegant']!.href,
        signatureCss: SIGNATURES['framed-cards']!,
      },
      generatedAt: new Date().toISOString(),
    };
  }
  it('applies the bespoke font link + signature CSS on top of the theme', () => {
    const { files } = renderSite(specWithDesign());
    const html = files['index.html']!;
    expect(html).toContain('Cormorant+Garamond'); // design font link, not the theme default
    expect(html).toContain(SIGNATURES['framed-cards']!); // signature treatment present
  });
});

describe('theme selection', () => {
  it('matches industry first, across the expanded library', () => {
    expect(selectTheme('Church / Ministry', 'Bold').id).toBe('sanctuary');
    expect(selectTheme('Restaurant / Cafe', 'Minimal').id).toBe('storefront');
    expect(selectTheme('Health & wellness', 'Warm').id).toBe('meridian');
    expect(selectTheme('Day spa / Salon', 'Warm').id).toBe('haven');
    expect(selectTheme('Home & trade services', 'Bold').id).toBe('forge');
    expect(selectTheme('Nonprofit', 'Professional').id).toBe('ledger');
    expect(selectTheme('Personal brand / portfolio', 'Minimal').id).toBe('gallery');
  });
  it('industry claims are mutually exclusive (deterministic auto-select)', () => {
    const seen = new Set<string>();
    for (const t of THEMES) for (const ind of t.suits.industries ?? []) {
      expect(seen.has(ind)).toBe(false);
      seen.add(ind);
    }
  });
  it('falls back to default for unknown industry/tone', () => {
    expect(selectTheme('Something else', undefined).id).toBe('atelier');
  });
});
