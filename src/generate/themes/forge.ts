import type { Theme } from './types';
import { baseCss } from './base';

// "Forge" — sturdy and industrial. Heavy grotesque type, thick borders, a
// full-bleed brand hero, blocky cards. For trades and home services that want
// to signal capability and get-it-done confidence.
export const forge: Theme = {
  id: 'forge',
  name: 'Forge',
  suits: { industries: ['Home & trade services'], tones: ['Bold'] },
  fonts: {
    display: `'Space Grotesk', system-ui, sans-serif`,
    body: `'Inter', system-ui, sans-serif`,
    googleHref: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap',
  },
  layout: { hero: 'full-bleed', nav: 'left', services: 'grid', corners: 4 },
  css(t) {
    return (
      `:root{--font-display:'Space Grotesk',system-ui,sans-serif;--font-body:'Inter',system-ui,sans-serif}` +
      baseCss(t, this.layout) +
      `.sf-hero--full-bleed{background:var(--brand);color:var(--brand-ink);border-bottom:6px solid var(--accent)}
       .sf-hero--full-bleed .sf-hero-sub{color:color-mix(in srgb,var(--brand-ink) 82%,transparent)}
       .sf-hero--full-bleed .sf-eyebrow{color:color-mix(in srgb,var(--brand-ink) 88%,transparent)}
       .sf-hero--full-bleed .sf-btn--primary{background:var(--brand-ink);color:var(--brand)}
       .sf-hero--full-bleed .sf-btn--ghost{border-color:color-mix(in srgb,var(--brand-ink) 5%,transparent);color:var(--brand-ink);background:color-mix(in srgb,var(--brand-ink) 12%,transparent)}
       .sf-hero-title{text-transform:uppercase;letter-spacing:-.01em;font-weight:700}
       .sf-brand{text-transform:uppercase}
       .sf-service{border:2px solid var(--ink)}
       .sf-btn{border-radius:4px}`
    );
  },
};
