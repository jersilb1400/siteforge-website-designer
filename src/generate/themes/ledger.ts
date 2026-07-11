import type { Theme } from './types';
import { baseCss } from './base';

// "Ledger" — institutional gravitas. A slab serif, tight structure, hairline
// rules, near-sharp corners. For nonprofits and mission-driven orgs that need
// to read as established and trustworthy.
export const ledger: Theme = {
  id: 'ledger',
  name: 'Ledger',
  suits: { industries: ['Nonprofit'], tones: ['Professional'] },
  fonts: {
    display: `'Roboto Slab', Georgia, serif`,
    body: `'Inter', system-ui, sans-serif`,
    googleHref: 'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@500;700&family=Inter:wght@400;500;600&display=swap',
  },
  layout: { hero: 'split', nav: 'left', services: 'list', corners: 2 },
  css(t) {
    return (
      `:root{--font-display:'Roboto Slab',Georgia,serif;--font-body:'Inter',system-ui,sans-serif}` +
      baseCss(t, this.layout) +
      `.sf-header{border-bottom:2px solid var(--ink)}
       .sf-section{border-top:1px solid var(--ink)}
       .sf-section-head h2{border-left:4px solid var(--accent);padding-left:.8rem}
       .sf-btn{border-radius:2px}`
    );
  },
};
