import type { Theme } from './types';
import { baseCss } from './base';

// "Storefront" — bold and appetite-forward. A full-bleed hero with the brand
// color flooding behind confident, tight display type; punchy cards. For
// restaurants, cafes, shops, trades — places that sell a feeling on sight.
export const storefront: Theme = {
  id: 'storefront',
  name: 'Storefront',
  suits: {
    industries: ['Restaurant / Cafe', 'Retail / shop', 'Home & trade services'],
    tones: ['Bold'],
  },
  fonts: {
    display: `'Space Grotesk', system-ui, sans-serif`,
    body: `'Inter', system-ui, sans-serif`,
    googleHref: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap',
  },
  layout: { hero: 'full-bleed', nav: 'left', services: 'grid', corners: 8 },
  css(t) {
    return (
      `:root{--font-display:'Space Grotesk',system-ui,sans-serif;--font-body:'Inter',system-ui,sans-serif}` +
      baseCss(t, this.layout) +
      // Signature: the hero floods with brand color; type goes tight and large.
      `.sf-hero--full-bleed{background:var(--brand);color:var(--brand-ink);border-radius:0 0 var(--r) var(--r);padding-top:clamp(3rem,9vw,7rem);padding-bottom:clamp(3rem,9vw,7rem)}
       .sf-hero--full-bleed .sf-hero-sub{color:color-mix(in srgb,var(--brand-ink) 82%,transparent)}
       .sf-hero--full-bleed .sf-eyebrow{color:color-mix(in srgb,var(--brand-ink) 88%,transparent)}
       .sf-hero--full-bleed .sf-btn--primary{background:var(--brand-ink);color:var(--brand)}
       .sf-hero--full-bleed .sf-btn--ghost{border-color:color-mix(in srgb,var(--brand-ink) 45%,transparent);color:var(--brand-ink)}
       .sf-hero-title{font-weight:700;letter-spacing:-.03em;text-transform:none}
       .sf-service{border-top:3px solid var(--accent)}`
    );
  },
};
