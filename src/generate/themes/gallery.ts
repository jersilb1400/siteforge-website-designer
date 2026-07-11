import type { Theme } from './types';
import { baseCss } from './base';

// "Gallery" — quiet and image-forward. A refined high-contrast serif, sharp
// corners, lots of whitespace, the work up front. For personal brands and
// portfolios where the images and typography carry the identity.
export const gallery: Theme = {
  id: 'gallery',
  name: 'Gallery',
  suits: { industries: ['Personal brand / portfolio'], tones: ['Minimal'] },
  fonts: {
    display: `'Cormorant Garamond', Georgia, serif`,
    body: `'Inter', system-ui, sans-serif`,
    googleHref: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500&display=swap',
  },
  layout: { hero: 'split', nav: 'left', services: 'grid', corners: 0 },
  css(t) {
    return (
      `:root{--font-display:'Cormorant Garamond',Georgia,serif;--font-body:'Inter',system-ui,sans-serif}` +
      baseCss(t, this.layout) +
      `.sf-hero-title{font-weight:500;font-size:clamp(2.6rem,7vw,4.6rem);letter-spacing:-.01em}
       .sf-section-head h2{font-weight:500}
       .sf-service{border:0;border-top:1px solid var(--ink);border-radius:0;background:transparent;padding-left:0;padding-right:0}
       .sf-tile img{border-radius:0}
       .sf-btn{border-radius:0}
       .sf-nav a{text-transform:uppercase;font-size:.8rem;letter-spacing:.1em}`
    );
  },
};
