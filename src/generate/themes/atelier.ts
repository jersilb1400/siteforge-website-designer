import type { Theme } from './types';
import { baseCss } from './base';

// "Atelier" — editorial and restrained. Generous whitespace, a characterful
// serif display against a clean sans, sharp corners, split hero. For studios,
// consultancies, personal brands: quiet confidence over decoration.
export const atelier: Theme = {
  id: 'atelier',
  name: 'Atelier',
  suits: {
    industries: ['Professional services (law, accounting, consulting)'],
    tones: ['Professional', 'Minimal'],
  },
  fonts: {
    display: `'Fraunces', Georgia, 'Times New Roman', serif`,
    body: `'Inter', system-ui, -apple-system, sans-serif`,
    googleHref: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap',
  },
  layout: { hero: 'split', nav: 'left', services: 'list', corners: 4 },
  css(t) {
    return (
      `:root{--font-display:'Fraunces',Georgia,serif;--font-body:'Inter',system-ui,sans-serif}` +
      baseCss(t, this.layout) +
      // Signature: an oversized italic-optical serif hero + hairline accent rule.
      `.sf-hero-title{font-weight:600;font-variation-settings:'opsz' 144}
       .sf-section-head{position:relative;padding-top:1rem}
       .sf-section-head::before{content:'';position:absolute;top:0;left:0;width:48px;height:2px;background:var(--accent)}
       .sf-brand{font-size:1.35rem}`
    );
  },
};
