import type { Theme } from './types';
import { baseCss } from './base';

// "Sanctuary" — warm and welcoming. Soft rounded forms, a friendly serif, a
// centered hero that greets the visitor. For churches, nonprofits, community
// and wellness orgs where warmth matters more than edge.
export const sanctuary: Theme = {
  id: 'sanctuary',
  name: 'Sanctuary',
  suits: {
    industries: ['Church / Ministry', 'Nonprofit', 'Health & wellness'],
    tones: ['Warm'],
  },
  fonts: {
    display: `'Newsreader', Georgia, serif`,
    body: `'Inter', system-ui, sans-serif`,
    googleHref: 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Inter:wght@400;500;600&display=swap',
  },
  layout: { hero: 'centered', nav: 'center', services: 'cards', corners: 16 },
  css(t) {
    return (
      `:root{--font-display:'Newsreader',Georgia,serif;--font-body:'Inter',system-ui,sans-serif}` +
      baseCss(t, this.layout) +
      // Signature: a soft brand-tinted hero panel and pill-rounded cards.
      `.sf-hero{background:radial-gradient(120% 120% at 50% 0%,color-mix(in srgb,var(--brand) 10%,var(--bg)) 0%,var(--bg) 60%);border-radius:0 0 32px 32px}
       .sf-hero-title{font-weight:500}
       .sf-service{border-radius:20px;box-shadow:0 10px 30px -18px color-mix(in srgb,var(--brand) 40%,transparent)}
       .sf-btn{border-radius:999px}
       .sf-service h3{color:var(--link)}`
    );
  },
};
