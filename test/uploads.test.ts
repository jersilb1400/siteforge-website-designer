import { describe, it, expect } from 'vitest';
import { sectionsForPages } from '../src/generate/spec';
import { renderSite } from '../src/generate/render';
import { resolvePalette } from '../src/generate/palette';
import type { SiteSpec } from '../src/generate/spec';

function baseSpec(overrides: Partial<SiteSpec> = {}): SiteSpec {
  return {
    projectId: 'proj_up',
    themeId: 'haven',
    business: {
      name: 'Lumen Salon',
      tagline: 'Quiet luxury',
      industry: 'Day spa / Salon',
      tone: 'Warm',
      story: 'A calm retreat.',
    },
    contact: { email: '', phone: '', address: 'Austin', hours: '', socials: {} },
    sections: sectionsForPages(['Home', 'Services', 'About', 'Gallery', 'Contact']),
    palette: resolvePalette({ brandColors: '#3e5245', tone: 'Warm' }),
    images: [
      { src: 'media/0.jpg', alt: 'Treatment room' },
      { src: 'media/1.jpg', alt: 'Massage' },
    ],
    content: {
      heroHeadline: 'Lumen Salon',
      heroSub: 'A calm retreat.',
      heroCtaLabel: 'Book an appointment',
      heroCtaHref: 'contact.html',
      aboutTitle: 'About Lumen Salon',
      aboutBody: ['A calm retreat for skin and body.'],
      servicesTitle: 'Rituals & services',
      services: [{ name: 'Signature Facial', desc: 'Custom glow.' }],
      highlights: [],
      ctaTitle: 'Reserve your time',
      ctaBody: 'Visit us in Austin.',
    },
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('client logo in generated sites', () => {
  it('renders the logo image in the nav when spec.logo is set', () => {
    const { files } = renderSite(
      baseSpec({ logo: { src: 'media/logo.png', alt: 'Lumen Salon logo' } }),
    );
    const home = files['index.html']!;
    expect(home).toContain('sf-brand--logo');
    expect(home).toContain('sf-logo');
    expect(home).toContain('media/logo.png');
    expect(home).toContain('Lumen Salon logo');
    // Brand text name is replaced by the logo image in the nav link.
    expect(home).toMatch(/<a class="sf-brand sf-brand--logo"[^>]*>\s*<img class="sf-logo"/);
  });

  it('keeps text brand when no logo is present', () => {
    const { files } = renderSite(baseSpec());
    const home = files['index.html']!;
    // CSS may mention .sf-brand--logo; the live nav link must stay text-only.
    expect(home).toMatch(/<a class="sf-brand" href="index.html">Lumen Salon<\/a>/);
    expect(home).not.toMatch(/<img class="sf-logo"/);
  });
});
