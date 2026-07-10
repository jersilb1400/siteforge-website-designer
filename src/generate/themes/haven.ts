import type { Theme } from './types';
import { baseCss } from './base';

// "Haven" — quiet luxury for day spas and salons. Soft stone surfaces, deep
// sage brand, a refined display serif against a warm humanist sans. Centered
// greeting, generous space, soft corners. Atmosphere comes from layered
// gradients and light motion — not cards or chrome.
export const haven: Theme = {
  id: 'haven',
  name: 'Haven',
  suits: { industries: ['Day spa / Salon'], tones: ['Warm', 'Minimal'] },
  fonts: {
    display: `'Cormorant', 'Cormorant Garamond', Georgia, serif`,
    body: `'Figtree', system-ui, sans-serif`,
    googleHref:
      'https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,500;0,600;1,500&family=Figtree:wght@400;500;600&display=swap',
  },
  layout: { hero: 'centered', nav: 'center', services: 'grid', corners: 14 },
  css(t) {
    return (
      `:root{--font-display:'Cormorant',Georgia,serif;--font-body:'Figtree',system-ui,sans-serif}` +
      baseCss(t, this.layout) +
      // Atmosphere: soft vertical wash + subtle grain via layered gradients.
      `body{background:
         radial-gradient(120% 80% at 50% -10%, color-mix(in srgb,var(--brand) 14%,transparent), transparent 55%),
         linear-gradient(180deg, color-mix(in srgb,var(--surface) 70%,var(--bg)) 0%, var(--bg) 42%, var(--bg) 100%)}
       .sf-header{background:color-mix(in srgb,var(--bg) 72%,transparent);border-bottom-color:color-mix(in srgb,var(--line) 70%,transparent)}
       .sf-brand{font-family:var(--font-display);font-weight:600;font-size:1.55rem;letter-spacing:.02em}
       .sf-nav a{font-size:.82rem;letter-spacing:.12em;text-transform:uppercase;opacity:.7}
       .sf-hero{padding-top:clamp(3.5rem,11vw,8rem);padding-bottom:clamp(3rem,8vw,6rem);
         animation:sf-haven-rise .9s ease both}
       .sf-hero-title{font-weight:500;font-size:clamp(2.8rem,8vw,5.2rem);letter-spacing:-.01em;
         font-style:italic}
       .sf-hero-sub{max-width:36ch;font-size:clamp(1.05rem,2vw,1.25rem);color:var(--muted);
         animation:sf-haven-rise .9s .12s ease both}
       .sf-hero-cta{animation:sf-haven-rise .9s .22s ease both}
       .sf-hero-cta .sf-btn--primary{border-radius:999px;padding:.85rem 1.7rem;letter-spacing:.04em}
       .sf-hero-cta .sf-btn--ghost{border-radius:999px;border-color:color-mix(in srgb,var(--ink) 22%,transparent)}
       .sf-eyebrow{letter-spacing:.22em;color:var(--brand)}
       .sf-section{border-top:0;position:relative}
       .sf-section-head h2{font-weight:500;font-style:italic}
       .sf-service{background:color-mix(in srgb,var(--surface) 88%,var(--brand));
         border-color:transparent;box-shadow:0 1px 0 color-mix(in srgb,var(--ink) 6%,transparent);
         transition:transform .25s ease,box-shadow .25s ease}
       .sf-service:hover{transform:translateY(-2px);box-shadow:0 12px 28px color-mix(in srgb,var(--brand) 12%,transparent)}
       .sf-service h3{font-family:var(--font-display);font-weight:600;font-size:1.35rem}
       .sf-btn{border-radius:999px}
       .sf-cta{background:color-mix(in srgb,var(--brand) 8%,var(--surface));border-radius:calc(var(--r) + 6px)}
       @keyframes sf-haven-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
       @media (prefers-reduced-motion:reduce){.sf-hero,.sf-hero-sub,.sf-hero-cta{animation:none}}`
    );
  },
};
