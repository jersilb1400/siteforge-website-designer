import type { Theme } from './types';
import { baseCss } from './base';

// "Meridian" — calm and airy. Generous space, a humanist serif, soft rounded
// forms, a centered greeting. For health, wellness, and care providers where
// the site should feel reassuring and unhurried.
export const meridian: Theme = {
  id: 'meridian',
  name: 'Meridian',
  suits: { industries: ['Health & wellness'], tones: ['Warm', 'Professional'] },
  fonts: {
    display: `'Newsreader', Georgia, serif`,
    body: `'Inter', system-ui, sans-serif`,
    googleHref: 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Inter:wght@400;500&display=swap',
  },
  layout: { hero: 'centered', nav: 'center', services: 'grid', corners: 18 },
  css(t) {
    return (
      `:root{--font-display:'Newsreader',Georgia,serif;--font-body:'Inter',system-ui,sans-serif}` +
      baseCss(t, this.layout) +
      `.sf-hero{padding-top:clamp(3rem,9vw,7rem)}
       .sf-hero-title{font-weight:400}
       .sf-section{border-top:0}
       .sf-service{background:color-mix(in srgb,var(--brand) 5%,var(--surface));border-color:transparent}
       .sf-btn{border-radius:999px}
       .sf-eyebrow{letter-spacing:.2em}`
    );
  },
};
