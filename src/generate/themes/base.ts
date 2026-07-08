import type { PaletteTokens } from '../palette';
import type { ThemeLayout } from './types';

// Structural, accessible CSS shared by all themes, parameterized by palette
// tokens and layout switches. Themes layer their fonts + signature touches on
// top. Ships inline (no CDN) so generated sites stay fast and Lighthouse-clean.

export function baseCss(t: PaletteTokens, layout: ThemeLayout): string {
  const r = layout.corners;
  return `
:root{
  --bg:${t.bg};--surface:${t.surface};--ink:${t.ink};--muted:${t.muted};
  --line:${t.line};--brand:${t.brand};--brand-ink:${t.brandInk};--link:${t.link};--accent:${t.accent};
  --r:${r}px;--maxw:1120px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-body);line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
a{color:var(--link)}
h1,h2,h3{font-family:var(--font-display);line-height:1.08;margin:0;font-weight:700}
.sf-eyebrow{font-family:var(--font-body);text-transform:uppercase;letter-spacing:.16em;font-size:.72rem;color:var(--accent);font-weight:600;margin:0 0 .5rem}
:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.sf-skip{position:absolute;left:-9999px;top:0;background:var(--ink);color:#fff;padding:.6rem 1rem;z-index:100}
.sf-skip:focus{left:0}

/* header / nav */
.sf-header{position:sticky;top:0;z-index:20;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.sf-nav-inner{max-width:var(--maxw);margin:0 auto;padding:.9rem 1.25rem;display:flex;align-items:center;justify-content:${layout.nav === 'center' ? 'center' : 'space-between'};gap:1.5rem;flex-wrap:wrap}
.sf-brand{font-family:var(--font-display);font-weight:700;font-size:1.25rem;text-decoration:none;color:var(--ink);letter-spacing:-.01em}
.sf-nav{display:flex;gap:1.25rem;flex-wrap:wrap}
.sf-nav a{text-decoration:none;color:var(--ink);font-size:.95rem;opacity:.85}
.sf-nav a:hover{opacity:1;color:var(--link)}

/* buttons */
.sf-btn{display:inline-block;padding:.8rem 1.4rem;border-radius:var(--r);text-decoration:none;font-weight:600;font-size:.98rem;border:1.5px solid transparent;transition:transform .06s ease,background .15s ease}
.sf-btn:active{transform:translateY(1px)}
.sf-btn--primary{background:var(--brand);color:var(--brand-ink)}
.sf-btn--primary:hover{filter:brightness(.94)}
.sf-btn--ghost{border-color:var(--line);color:var(--ink)}
.sf-btn--ghost:hover{border-color:var(--ink)}

/* hero */
.sf-hero{max-width:var(--maxw);margin:0 auto;padding:clamp(2.5rem,7vw,6rem) 1.25rem}
.sf-hero-title{font-size:clamp(2.2rem,6vw,4rem);letter-spacing:-.02em}
.sf-hero-sub{font-size:clamp(1.05rem,2.2vw,1.35rem);color:var(--muted);max-width:42ch;margin:1.1rem 0 1.8rem}
.sf-hero-cta{display:flex;gap:.8rem;flex-wrap:wrap}
.sf-hero--split{display:grid;grid-template-columns:1.1fr .9fr;gap:3rem;align-items:center}
.sf-hero--split .sf-hero-media img{border-radius:var(--r);width:100%;object-fit:cover;aspect-ratio:4/3}
.sf-hero--centered{text-align:center}
.sf-hero--centered .sf-hero-sub,.sf-hero--centered .sf-hero-cta{margin-left:auto;margin-right:auto}
.sf-hero--centered .sf-hero-cta{justify-content:center}
.sf-hero--full-bleed{position:relative}
.sf-hero--full-bleed .sf-hero-media{position:absolute;inset:0;z-index:0;opacity:.16}
.sf-hero--full-bleed .sf-hero-media img{width:100%;height:100%;object-fit:cover}
.sf-hero--full-bleed .sf-hero-body{position:relative;z-index:1;max-width:46ch}

/* sections */
.sf-section{max-width:var(--maxw);margin:0 auto;padding:clamp(2.5rem,6vw,5rem) 1.25rem;border-top:1px solid var(--line)}
.sf-section-head{margin-bottom:2rem}
.sf-section-head h2{font-size:clamp(1.6rem,4vw,2.5rem);letter-spacing:-.02em}
.sf-about-body{max-width:60ch;font-size:1.1rem}
.sf-about-body p{margin:0 0 1rem}
.sf-highlights{list-style:none;padding:0;margin:1.5rem 0 0;display:flex;flex-wrap:wrap;gap:.6rem}
.sf-highlights li{background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:.4rem .9rem;font-size:.9rem}

/* services */
.sf-service-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.sf-services--list .sf-service-grid{grid-template-columns:1fr;max-width:70ch}
.sf-service{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:1.5rem}
.sf-service h3{font-size:1.2rem;margin-bottom:.5rem}
.sf-service p{margin:0;color:var(--muted)}
.sf-services--list .sf-service{border:0;border-bottom:1px solid var(--line);border-radius:0;padding:1.1rem 0;background:transparent}

/* gallery */
.sf-gallery-grid{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.sf-tile{margin:0}
.sf-tile img{border-radius:var(--r);width:100%;aspect-ratio:4/3;object-fit:cover}

/* contact */
.sf-contact-lead{font-size:1.15rem;color:var(--muted);max-width:50ch}
.sf-contact-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin-top:1.5rem}
.sf-contact-row span{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:var(--accent);font-weight:600;margin-bottom:.25rem}
.sf-contact-row p{margin:0;font-size:1.05rem}
.sf-socials{display:flex;gap:1rem;margin-top:1.5rem;text-transform:capitalize}

/* footer */
.sf-footer{max-width:var(--maxw);margin:0 auto;padding:2.5rem 1.25rem;border-top:1px solid var(--line);display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem;color:var(--muted);font-size:.9rem}
.sf-footer-by{opacity:.7}

@media (max-width:760px){
  .sf-hero--split{grid-template-columns:1fr}
  .sf-hero--split .sf-hero-media{order:-1}
}
`;
}
