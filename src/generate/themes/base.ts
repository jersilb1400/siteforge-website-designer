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
.sf-brand--logo{display:inline-flex;align-items:center;line-height:0}
.sf-logo{display:block;height:clamp(1.75rem,3.5vw,2.4rem);width:auto;max-width:min(200px,42vw);object-fit:contain}
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

/* testimonials */
.sf-quote-grid{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.sf-quote{margin:0;padding:1.4rem 1.5rem;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);border-left:3px solid var(--accent)}
.sf-quote p{margin:0 0 .85rem;font-size:1.05rem;line-height:1.55;font-style:italic}
.sf-quote footer{font-size:.85rem;color:var(--muted);font-style:normal}

/* FAQ (CSS-only accordion) */
.sf-faq-list{display:flex;flex-direction:column;gap:.55rem;max-width:44rem}
.sf-faq-item{border:1px solid var(--line);border-radius:var(--r);background:var(--surface);padding:.15rem 1rem}
.sf-faq-item summary{cursor:pointer;font-weight:600;padding:.85rem 0;list-style:none}
.sf-faq-item summary::-webkit-details-marker{display:none}
.sf-faq-item summary::after{content:'+';float:right;color:var(--accent);font-weight:700}
.sf-faq-item[open] summary::after{content:'–'}
.sf-faq-item p{margin:0 0 1rem;color:var(--muted)}

/* team */
.sf-team-grid{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.sf-team-card{padding:1.35rem;border:1px solid var(--line);border-radius:var(--r);background:var(--surface)}
.sf-team-card h3{font-size:1.2rem;margin:0 0 .25rem}
.sf-team-role{margin:0 0 .6rem;color:var(--accent);font-size:.85rem;letter-spacing:.06em;text-transform:uppercase}
.sf-team-card p{margin:0;color:var(--muted)}

/* trust line + sticky CTA */
.sf-trust-line{margin:.25rem 0 1.25rem;font-size:.9rem;letter-spacing:.04em;color:var(--muted)}
.sf-hero--full-bleed-recipe{max-width:none;margin:0;padding:0 1.25rem;min-height:min(88dvh,52rem);display:flex;align-items:center;position:relative;isolation:isolate}
.sf-hero--full-bleed-recipe .sf-hero-body{position:relative;z-index:2;max-width:40rem}
.sf-sticky-cta{position:fixed;right:1rem;bottom:1rem;z-index:30;display:none}
.sf-sticky-cta .sf-btn{box-shadow:0 12px 32px -12px rgba(0,0,0,.45)}
.sf-contact-cta{margin-bottom:1.25rem}

@media (max-width:760px){
  .sf-hero--split{grid-template-columns:1fr}
  .sf-hero--split .sf-hero-media{order:-1}
  .sf-about--split{grid-template-columns:1fr}
  .sf-about--split .sf-about-media{order:-1}
  .sf-gallery-grid--rich .sf-tile--feature{grid-column:auto}
  .sf-gallery-grid--rich .sf-tile--feature img{aspect-ratio:4/3}
  .sf-sticky-cta{display:block}
}

/* ── Micro-animations (all recipes) ─────────────────────────────── */
.sf-reveal{animation:sf-reveal-up .75s cubic-bezier(.22,1,.36,1) both;animation-delay:var(--sf-delay,0ms)}
@keyframes sf-reveal-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.sf-barely-brand{font-family:var(--font-display);font-size:clamp(1.05rem,2.2vw,1.35rem);font-weight:700;letter-spacing:.02em;margin:0 0 .75rem}

/* ── Layout Blueprint: editorial-luxury (Barely There) ──────────── */
.sf-hero--barely{position:relative;min-height:min(100dvh,72rem);overflow:hidden;display:flex;align-items:flex-end;padding:0;max-width:none;margin:0}
.sf-hero--barely .sf-hero-media-fill{position:absolute;inset:0;z-index:0}
.sf-hero--barely .sf-hero-media-fill img{width:100%;height:100%;object-fit:cover;object-position:center}
.sf-barely-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(12,14,12,.15) 0%,rgba(12,14,12,.55) 55%,rgba(12,14,12,.82) 100%)}
.sf-barely-body{position:relative;z-index:2;max-width:min(36rem,92vw);padding:clamp(2.5rem,6vw,5rem) clamp(1.5rem,4vw,3.5rem)}
.sf-barely-body .sf-barely-brand{color:#f7f3ec;font-size:clamp(2.4rem,7vw,4.8rem);letter-spacing:-.03em;line-height:1.02;margin:0 0 1rem}
.sf-barely-line{font-family:var(--font-body);font-weight:400;font-size:clamp(1.05rem,2.2vw,1.35rem);color:rgba(247,243,236,.82);margin:0 0 1.75rem;max-width:34ch;line-height:1.45;letter-spacing:0}
.sf-barely-services{border-top:0}
.sf-barely-rows{display:flex;flex-direction:column;max-width:48rem}
.sf-barely-row{display:grid;grid-template-columns:minmax(10rem,16rem) 1fr;gap:1.5rem;align-items:baseline;padding:1.35rem 0;border-bottom:1px solid var(--line);text-decoration:none;color:inherit;transition:opacity .2s ease}
.sf-barely-row:hover{opacity:.72}
.sf-barely-row-name{font-family:var(--font-display);font-size:1.15rem;font-weight:600;letter-spacing:-.01em}
.sf-barely-row-desc{color:var(--muted);font-size:.98rem;line-height:1.55}
.sf-barely-about{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(2rem,5vw,4rem);align-items:center;max-width:var(--maxw);margin:0 auto;border-top:1px solid var(--line)}
.sf-barely-about-media img{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:var(--r)}
.sf-barely-about-copy h2{font-size:clamp(1.6rem,4vw,2.4rem);margin:.35rem 0 1rem}
.sf-barely-about-copy p{color:var(--muted);max-width:40ch;font-size:1.08rem;line-height:1.65}
.sf-barely-about-copy .sf-btn{margin-top:1.5rem}
@media(max-width:760px){
  .sf-barely-row{grid-template-columns:1fr;gap:.35rem;padding:1.1rem 0}
  .sf-barely-about{grid-template-columns:1fr}
  .sf-barely-about-media{order:-1}
}

/* ── Layout Blueprint: warm-hospitality (Bento + Tactile) ───────── */
.sf-hero--magazine-bottom{position:relative;min-height:min(90dvh,60rem);overflow:hidden;display:flex;align-items:flex-end;padding:0;max-width:none;margin:0}
.sf-hero--magazine-bottom .sf-hero-media-fill{position:absolute;inset:0;z-index:0}
.sf-hero--magazine-bottom .sf-hero-media-fill img{width:100%;height:100%;object-fit:cover;object-position:center}
.sf-hero--magazine-bottom::after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(0deg,rgba(8,8,8,.82) 0%,rgba(8,8,8,.35) 50%,rgba(8,8,8,.06) 100%)}
.sf-hero-magazine-bar{position:relative;z-index:2;width:100%;padding:clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3.5rem)}
.sf-hero-magazine-bar .sf-barely-brand{color:#f5f0e8;font-size:clamp(2.2rem,6vw,3.8rem);margin:0 0 .4rem}
.sf-hero-magazine-bar .sf-hero-title{color:#f5f0e8;font-size:clamp(1.6rem,4vw,2.6rem);letter-spacing:-.02em;margin:0 0 .7rem;font-weight:600}
.sf-hero-magazine-bar .sf-hero-sub{color:rgba(245,240,232,.78);font-size:clamp(1rem,2vw,1.2rem);margin:0 0 1.5rem;max-width:42ch}
.sf-hero-magazine-bar .sf-eyebrow{color:var(--accent)}
.sf-bento-home{max-width:var(--maxw);margin:0 auto;padding:clamp(2.5rem,5vw,4rem) 1.25rem}
.sf-bento-home--tactile{position:relative}
.sf-bento-home--tactile::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.035;background-image:repeating-radial-gradient(circle at 17% 32%,var(--ink) 0 1px,transparent 1px 3px),repeating-radial-gradient(circle at 72% 64%,var(--ink) 0 1px,transparent 1px 4px)}
.sf-bento-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:.75rem}
.sf-bento-grid--tactile{gap:.85rem}
.sf-bento-feature{grid-column:1/8;grid-row:1/3;min-height:clamp(20rem,40vw,32rem);overflow:hidden;border-radius:calc(var(--r) + 2px);box-shadow:0 18px 40px -24px rgba(0,0,0,.35)}
.sf-bento-feature img{width:100%;height:100%;object-fit:cover}
.sf-bento-tile{grid-column:span 5;background:var(--surface);border:1px solid var(--line);border-radius:calc(var(--r) + 2px);padding:1.5rem 1.75rem;display:flex;flex-direction:column;justify-content:center;min-height:9rem;box-shadow:0 1px 0 color-mix(in srgb,var(--ink) 6%,transparent)}
.sf-bento-tile h3{font-size:1.15rem;margin:0 0 .35rem}
.sf-bento-tile p{margin:0;color:var(--muted);font-size:.93rem}
.sf-bento-tile--dark{background:var(--brand);border-color:var(--brand);grid-column:8/13}
.sf-bento-tile--dark h3,.sf-bento-tile--dark p,.sf-bento-tile--dark .sf-eyebrow{color:var(--brand-ink)}
.sf-bento-tile--media{padding:0;overflow:hidden;grid-column:span 4;min-height:11rem}
.sf-bento-tile--media img{width:100%;height:100%;object-fit:cover;min-height:11rem}
.sf-bento-tile--tactile{grid-column:span 4;border-width:2px;border-style:solid;border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}
.sf-bento-highlights{list-style:none;padding:0;margin:.5rem 0 0;display:flex;flex-direction:column;gap:.45rem}
.sf-bento-highlights li{font-size:.95rem;padding-left:1rem;position:relative}
.sf-bento-highlights li::before{content:'';position:absolute;left:0;top:.55em;width:.4rem;height:.4rem;border-radius:50%;background:var(--accent)}
@media(max-width:760px){
  .sf-bento-grid,.sf-bento-grid--tactile{grid-template-columns:1fr 1fr}
  .sf-bento-feature{grid-column:1/-1;grid-row:auto;min-height:14rem}
  .sf-bento-tile,.sf-bento-tile--dark,.sf-bento-tile--media,.sf-bento-tile--tactile{grid-column:span 1}
}

/* ── Layout Blueprint: reverent-sanctuary (Kinetic Type) ────────── */
.sf-hero--kinetic{position:relative;min-height:min(94dvh,68rem);overflow:hidden;display:flex;align-items:center;padding:clamp(3rem,8vw,6rem) 1.5rem;max-width:none;margin:0}
.sf-hero--kinetic .sf-hero-media-fill{position:absolute;inset:0;z-index:0}
.sf-hero--kinetic .sf-hero-media-fill img{width:100%;height:100%;object-fit:cover;object-position:center;filter:saturate(.85) brightness(.92)}
.sf-kinetic-veil{position:absolute;inset:0;z-index:1;background:linear-gradient(115deg,rgba(8,10,12,.78) 0%,rgba(8,10,12,.45) 55%,rgba(8,10,12,.25) 100%)}
.sf-kinetic-body{position:relative;z-index:2;max-width:min(52rem,94vw)}
.sf-kinetic-brand{color:rgba(248,245,240,.7);font-size:.95rem;letter-spacing:.22em;text-transform:uppercase;margin:0 0 1.25rem;font-weight:600}
.sf-kinetic-title{display:flex;flex-direction:column;gap:.15em;margin:0 0 1.25rem}
.sf-kinetic-line{display:block;font-family:var(--font-display);font-size:clamp(2.8rem,9vw,6.5rem);line-height:.95;letter-spacing:-.035em;color:#f8f5f0;font-weight:700;animation:sf-kinetic-in .9s cubic-bezier(.22,1,.36,1) both;animation-delay:var(--sf-delay,0ms)}
@keyframes sf-kinetic-in{from{opacity:0;transform:translateY(1.1em)}to{opacity:1;transform:none}}
.sf-kinetic-sub{color:rgba(248,245,240,.78);font-size:clamp(1.05rem,2.2vw,1.3rem);max-width:36ch;margin:0 0 1.75rem}
.sf-type-ministries{border-top:1px solid var(--line)}
.sf-type-list{display:flex;flex-direction:column;gap:0;max-width:52rem}
.sf-type-block{display:grid;grid-template-columns:4.5rem 1fr;gap:1.25rem;padding:2rem 0;border-bottom:1px solid var(--line)}
.sf-type-index{font-family:var(--font-display);font-size:clamp(1.8rem,4vw,2.6rem);font-weight:700;letter-spacing:-.03em;color:var(--accent);line-height:1;opacity:.7}
.sf-type-copy h3{font-size:clamp(1.4rem,3vw,2rem);margin:0 0 .5rem;letter-spacing:-.02em}
.sf-type-copy p{margin:0;color:var(--muted);max-width:48ch;font-size:1.05rem;line-height:1.65}
@media(max-width:640px){.sf-type-block{grid-template-columns:3rem 1fr;gap:.85rem}}

/* ── Layout Blueprint: clean-clinic (Conversion + Journey) ──────── */
.sf-hero--conversion{max-width:var(--maxw);margin:0 auto;padding:clamp(4rem,9vw,7rem) 1.25rem;display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.sf-hero--conversion .sf-barely-brand{font-size:clamp(2rem,5vw,3.2rem);letter-spacing:-.025em;margin:0 0 .5rem}
.sf-hero--conversion .sf-hero-title{font-size:clamp(1.45rem,3.2vw,2.1rem);letter-spacing:-.02em;margin:.35rem 0 .85rem;font-weight:600;max-width:28ch;line-height:1.25}
.sf-hero--conversion .sf-hero-sub{font-size:clamp(1rem,2vw,1.15rem);color:var(--muted);max-width:40ch;margin:0 0 1.25rem}
.sf-hero--conversion .sf-hero-media img{border-radius:var(--r);width:100%;aspect-ratio:4/5;object-fit:cover;object-position:top}
.sf-journey{border-top:1px solid var(--line)}
.sf-journey-list{list-style:none;padding:0;margin:2rem 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1.25rem;counter-reset:none}
.sf-journey-step{display:flex;flex-direction:column;gap:.75rem;padding:1.5rem 1.35rem;border-top:3px solid var(--accent);background:var(--surface);border-radius:0 0 var(--r) var(--r)}
.sf-journey-num{font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--accent);letter-spacing:-.02em;line-height:1}
.sf-journey-body h3{font-size:1.1rem;margin:0 0 .4rem}
.sf-journey-body p{margin:0;color:var(--muted);font-size:.93rem;line-height:1.55}
.sf-cta-ladder{border-top:1px solid var(--line);background:color-mix(in srgb,var(--brand) 6%,var(--bg))}
.sf-cta-ladder-inner{max-width:40rem;margin:0 auto;text-align:center}
.sf-cta-ladder-inner h2{font-size:clamp(1.6rem,4vw,2.4rem);margin-bottom:.75rem}
.sf-cta-ladder-inner p{color:var(--muted);margin:0 0 1.4rem}
.sf-cta-ladder-actions{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center}
.sf-numbered-services{max-width:var(--maxw);margin:0 auto;padding:clamp(2.5rem,6vw,5rem) 1.25rem;border-top:1px solid var(--line)}
.sf-numbered-list{list-style:none;padding:0;margin:2rem 0 0;display:flex;flex-direction:column;gap:0}
.sf-numbered-item{display:grid;grid-template-columns:4rem 1fr;gap:1.5rem;align-items:start;padding:2rem 0;border-bottom:1px solid var(--line)}
.sf-numbered-item:last-child{border-bottom:0}
.sf-item-num{font-size:1.4rem;font-weight:700;color:var(--accent);opacity:.55;letter-spacing:-.02em;line-height:1;padding-top:.15rem}
.sf-item-body h3{font-size:1.2rem;margin:0 0 .45rem}
.sf-item-body p{margin:0;color:var(--muted);max-width:54ch;line-height:1.65}
.sf-numbered-item .sf-service-media{border-radius:var(--r);overflow:hidden;margin-top:1rem}
.sf-numbered-item .sf-service-media img{width:100%;aspect-ratio:16/9;object-fit:cover}
@media(max-width:760px){
  .sf-hero--conversion{grid-template-columns:1fr}
  .sf-hero--conversion .sf-hero-media{order:-1}
  .sf-numbered-item{grid-template-columns:2.5rem 1fr;gap:1rem}
}

/* ── Layout Blueprint: craft-trade (Deep Mono + Neon) ───────────── */
.sf-hero--neon{position:relative;min-height:min(90dvh,62rem);overflow:hidden;display:flex;align-items:center;padding:clamp(4rem,8vw,6rem) 1.25rem;max-width:none;margin:0;background:#0a0a0b}
.sf-hero--neon .sf-hero-media-fill{position:absolute;inset:0;z-index:0}
.sf-hero--neon .sf-hero-media-fill img{width:100%;height:100%;object-fit:cover;object-position:center;filter:grayscale(.35) contrast(1.15) brightness(.55)}
.sf-neon-overlay{position:absolute;inset:0;z-index:1;background:linear-gradient(105deg,rgba(6,6,8,.92) 0%,rgba(6,6,8,.7) 45%,rgba(6,6,8,.35) 100%)}
.sf-neon-body{position:relative;z-index:2;max-width:44rem}
.sf-neon-rule{width:3.5rem;height:3px;background:var(--accent);box-shadow:0 0 18px color-mix(in srgb,var(--accent) 70%,transparent);margin:0 0 1.25rem}
.sf-neon-eyebrow,.sf-neon-portfolio .sf-neon-eyebrow{color:var(--accent)!important;letter-spacing:.2em;text-shadow:0 0 12px color-mix(in srgb,var(--accent) 45%,transparent)}
.sf-neon-brand{font-family:var(--font-display);font-size:clamp(2.4rem,7vw,4.6rem);color:#f2ede4;letter-spacing:-.03em;line-height:1.02;margin:0 0 .75rem;font-weight:700}
.sf-hero--neon .sf-hero-title{color:#f2ede4;font-size:clamp(1.35rem,3vw,1.85rem);font-weight:500;letter-spacing:-.01em;margin:0 0 .9rem;max-width:36ch;line-height:1.3}
.sf-hero--neon .sf-hero-sub{color:rgba(242,237,228,.68);font-size:clamp(1rem,2.2vw,1.15rem);max-width:42ch;margin:0 0 1.75rem}
.sf-btn--neon{box-shadow:0 0 24px color-mix(in srgb,var(--accent) 35%,transparent)}
.sf-btn--neon-ghost{border-color:rgba(242,237,228,.35);color:#f2ede4}
.sf-btn--neon-ghost:hover{border-color:var(--accent);color:var(--accent)}
.sf-neon-portfolio{background:color-mix(in srgb,#0a0a0b 4%,var(--bg))}
.sf-portfolio-section{max-width:var(--maxw);margin:0 auto;padding:clamp(2.5rem,6vw,5rem) 1.25rem;border-top:1px solid var(--line)}
.sf-portfolio-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:.75rem;margin-top:2rem}
.sf-portfolio-item{overflow:hidden;border-radius:var(--r);background:#111;position:relative}
.sf-neon-item{border:1px solid color-mix(in srgb,var(--accent) 18%,transparent)}
.sf-portfolio-item img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .45s ease;filter:grayscale(.2)}
.sf-portfolio-item:hover img{transform:scale(1.04);filter:grayscale(0)}
.sf-portfolio-item--featured{grid-column:1/8;min-height:clamp(18rem,32vw,26rem)}
.sf-portfolio-item:not(.sf-portfolio-item--featured){grid-column:span 5}
.sf-neon-placeholder{min-height:12rem;background:linear-gradient(135deg,#141416,color-mix(in srgb,var(--accent) 20%,#141416))}
.sf-portfolio-label{position:absolute;bottom:0;left:0;right:0;padding:1.25rem 1.35rem;background:linear-gradient(0deg,rgba(8,8,8,.88) 0%,rgba(8,8,8,0) 100%)}
.sf-portfolio-label h3{font-size:1.05rem;margin:0 0 .2rem;color:#f2ede4}
.sf-portfolio-label p{margin:0;font-size:.85rem;color:rgba(242,237,228,.65)}
.sf-neon-service{border-color:color-mix(in srgb,var(--accent) 22%,var(--line))}
@media(max-width:760px){
  .sf-portfolio-grid{grid-template-columns:1fr 1fr}
  .sf-portfolio-item--featured{grid-column:1/-1}
  .sf-portfolio-item:not(.sf-portfolio-item--featured){grid-column:span 1}
}

/* ── Layout Blueprint: mission-ledger (Dynamic Typography) ──────── */
.sf-hero--impact-stat{max-width:var(--maxw);margin:0 auto;padding:clamp(4rem,9vw,7rem) 1.25rem;display:grid;grid-template-columns:1.2fr .8fr;gap:clamp(2rem,5vw,5rem);align-items:center}
.sf-hero--dynamic .sf-barely-brand{margin-bottom:.5rem}
.sf-impact-headline{margin:1rem 0 1.25rem}
.sf-impact-num,.sf-dynamic-num{display:block;font-size:clamp(3.5rem,10vw,7rem);font-weight:700;letter-spacing:-.04em;color:var(--brand);line-height:.95;font-variant-numeric:tabular-nums}
.sf-impact-context{display:block;font-size:clamp(.95rem,2vw,1.15rem);color:var(--muted);margin-top:.6rem;max-width:28ch;line-height:1.45}
.sf-hero--impact-stat .sf-hero-title{font-size:clamp(1.5rem,3vw,2rem);letter-spacing:-.02em;margin:.5rem 0 1.25rem;max-width:36ch;font-weight:600;line-height:1.28}
.sf-hero--impact-stat .sf-hero-media img{border-radius:var(--r);width:100%;aspect-ratio:3/4;object-fit:cover}
.sf-story-section{max-width:var(--maxw);margin:0 auto;padding:clamp(2.5rem,6vw,5rem) 1.25rem;border-top:1px solid var(--line);display:grid;grid-template-columns:1fr 1fr;gap:clamp(2rem,6vw,6rem);align-items:start}
.sf-story-body{font-size:1.1rem;line-height:1.7}
.sf-story-body p{margin:0 0 1rem;color:var(--muted)}
.sf-story-pull,.sf-dynamic-pull{font-size:clamp(1.4rem,2.8vw,1.9rem);font-weight:600;letter-spacing:-.02em;color:var(--ink);font-style:italic;border-left:3px solid var(--accent);padding-left:1.25rem;line-height:1.35;margin:0}
.sf-impact-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:2rem}
.sf-impact-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:1.5rem;text-align:center}
.sf-impact-card-num{font-size:clamp(1.6rem,3.5vw,2.5rem);font-weight:700;color:var(--brand);letter-spacing:-.03em;display:block;margin-bottom:.25rem}
.sf-impact-card-label{font-size:.82rem;color:var(--muted);text-transform:uppercase;letter-spacing:.1em}
@media(max-width:760px){
  .sf-hero--impact-stat{grid-template-columns:1fr}
  .sf-story-section{grid-template-columns:1fr}
  .sf-impact-grid{grid-template-columns:1fr 1fr}
}
`;
}
