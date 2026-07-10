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
.sf-nav a.is-active,.sf-nav a[aria-current="page"]{opacity:1;color:var(--link);font-weight:600}

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
/* Centered hero with a real photo: image sits behind copy with a readable scrim. */
.sf-hero--has-photo{position:relative;isolation:isolate}
.sf-hero-media--bleed{position:absolute;inset:0;z-index:0;overflow:hidden}
.sf-hero-media--bleed img{width:100%;height:100%;object-fit:cover;object-position:center}
.sf-hero--has-photo .sf-hero-body{position:relative;z-index:2}
.sf-hero--has-photo.sf-hero--centered::after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(10,12,10,.55) 0%,rgba(10,12,10,.72) 55%,rgba(10,12,10,.88) 100%)}

/* inner page hero (photo banner under nav) */
.sf-page-hero{position:relative;isolation:isolate;min-height:clamp(14rem,32vw,22rem);
  display:flex;align-items:flex-end;overflow:hidden;background:color-mix(in srgb,var(--brand) 18%,var(--bg))}
.sf-page-hero-media{position:absolute;inset:0;z-index:0}
.sf-page-hero-media img{width:100%;height:100%;object-fit:cover;object-position:center}
.sf-page-hero--has-photo::after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(180deg,rgba(10,12,10,.25) 0%,rgba(10,12,10,.72) 100%)}
.sf-page-hero-body{position:relative;z-index:2;max-width:var(--maxw);width:100%;margin:0 auto;
  padding:clamp(2.5rem,6vw,4rem) 1.25rem}
.sf-page-hero--has-photo .sf-page-hero-title,.sf-page-hero--has-photo .sf-page-hero-lead,
.sf-page-hero--has-photo .sf-eyebrow{color:#f6f1e6}
.sf-page-hero--has-photo .sf-eyebrow{color:color-mix(in srgb,var(--accent) 70%,#f6f1e6)}
.sf-page-hero-title{font-size:clamp(2rem,5vw,3.4rem);letter-spacing:-.02em;margin:.25rem 0 .6rem}
.sf-page-hero-lead{margin:0;max-width:48ch;font-size:1.1rem;opacity:.9}

/* sections */
.sf-section{max-width:var(--maxw);margin:0 auto;padding:clamp(2.5rem,6vw,5rem) 1.25rem;border-top:1px solid var(--line)}
.sf-section-head{margin-bottom:2rem}
.sf-section-head h2{font-size:clamp(1.6rem,4vw,2.5rem);letter-spacing:-.02em}
.sf-section-lead{margin:.6rem 0 0;color:var(--muted);max-width:48ch}
.sf-about-body{max-width:60ch;font-size:1.1rem}
.sf-about-body p{margin:0 0 1rem}
.sf-about--split{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(1.5rem,4vw,3rem);align-items:center}
.sf-about-media img{border-radius:var(--r);width:100%;aspect-ratio:4/5;object-fit:cover}
.sf-highlights{list-style:none;padding:0;margin:1.5rem 0 0;display:flex;flex-wrap:wrap;gap:.6rem}
.sf-highlights li{background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:.4rem .9rem;font-size:.9rem}

/* home teasers */
.sf-teaser-grid{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.sf-teaser-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.sf-teaser-media img{width:100%;aspect-ratio:3/2;object-fit:cover}
.sf-teaser-copy{padding:1.15rem 1.25rem 1.35rem}
.sf-teaser-copy h3{font-size:1.2rem;margin:0 0 .4rem}
.sf-teaser-copy p{margin:0;color:var(--muted);font-size:.95rem}
.sf-teaser-more{margin:1.5rem 0 0}
.sf-home-cta{border-top:1px solid var(--line)}
.sf-home-cta-inner{max-width:40rem;margin:0 auto;text-align:center}
.sf-home-cta-inner h2{font-size:clamp(1.6rem,4vw,2.4rem);margin-bottom:.75rem}
.sf-home-cta-inner p{color:var(--muted);margin:0 0 1.4rem}

/* services */
.sf-service-grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.sf-services--list .sf-service-grid{grid-template-columns:1fr;max-width:70ch}
.sf-service{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:1.5rem}
.sf-service h3{font-size:1.2rem;margin-bottom:.5rem}
.sf-service p{margin:0;color:var(--muted)}
.sf-service--imaged{padding:0;overflow:hidden}
.sf-service--imaged .sf-service-inner{padding:0 0 1.35rem}
.sf-service-media img{width:100%;aspect-ratio:3/2;object-fit:cover}
.sf-service--imaged h3,.sf-service--imaged p{padding:0 1.25rem}
.sf-service--imaged h3{margin-top:1.1rem}
.sf-services--list .sf-service{border:0;border-bottom:1px solid var(--line);border-radius:0;padding:1.1rem 0;background:transparent}

/* gallery */
.sf-gallery-grid{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.sf-gallery-grid--rich{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.sf-gallery-grid--rich .sf-tile--feature{grid-column:1 / -1}
.sf-gallery-grid--rich .sf-tile--feature img{aspect-ratio:21/9}
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
  .sf-about--split{grid-template-columns:1fr}
  .sf-about--split .sf-about-media{order:-1}
  .sf-gallery-grid--rich .sf-tile--feature{grid-column:auto}
  .sf-gallery-grid--rich .sf-tile--feature img{aspect-ratio:4/3}
}
`;
}
