import type { Theme } from './types';
import { baseCss } from './base';

// "Haven" — Editorial Luxury for day spas and salons. A cinematic, full-bleed
// dark atmosphere opens the page (brand name as the hero, not a card in
// sight), then settles into quiet stone/cream surfaces for the rest of the
// site. Deep sage + warm brass carry the palette — deliberately not the
// cream+terracotta default. Motion is springy but restrained: a staggered
// hero rise, a staggered service-card fade, and a scroll-linked reveal for
// the sections beneath (progressively enhanced, CSS-only).
export const haven: Theme = {
  id: 'haven',
  name: 'Haven',
  suits: { industries: ['Day spa / Salon'], tones: ['Warm', 'Minimal'] },
  fonts: {
    display: `'Cormorant', 'Cormorant Garamond', Georgia, serif`,
    body: `'Figtree', system-ui, sans-serif`,
    googleHref:
      'https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,500;0,600;1,500;1,600&family=Figtree:wght@400;500;600&display=swap',
  },
  layout: { hero: 'centered', nav: 'center', services: 'grid', corners: 14 },
  css(t) {
    return (
      `:root{--font-display:'Cormorant',Georgia,serif;--font-body:'Figtree',system-ui,sans-serif;
        --haven-ink:#f6f1e6;--haven-gold:#d9b878;--haven-dusk:#12160f}` +
      baseCss(t, this.layout) +
      // Quiet stone atmosphere for the body, beneath the dark hero.
      `body{background:
         radial-gradient(120% 60% at 50% 0%, color-mix(in srgb,var(--brand) 7%,transparent), transparent 60%),
         var(--bg)}

       /* ---- floating glass-island nav (reads over dark hero and light body) ---- */
       .sf-header{position:sticky;top:0;z-index:20;background:transparent;border-bottom:0;
         backdrop-filter:none;padding:1rem 1rem 0}
       .sf-nav-inner{max-width:fit-content;margin:0 auto;gap:1.75rem;
         background:color-mix(in srgb,var(--haven-dusk) 82%,transparent);
         border:1px solid color-mix(in srgb,var(--haven-ink) 12%,transparent);
         border-radius:999px;padding:.7rem 1.6rem;
         backdrop-filter:blur(16px) saturate(140%);-webkit-backdrop-filter:blur(16px) saturate(140%);
         box-shadow:0 18px 40px -22px rgba(0,0,0,.5)}
       .sf-brand{font-family:var(--font-display);font-weight:600;font-size:1.4rem;letter-spacing:.01em;
         font-style:italic;color:var(--haven-ink)}
       .sf-nav a{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;
         color:color-mix(in srgb,var(--haven-ink) 78%,transparent);opacity:1;transition:color .25s ease}
       .sf-nav a:hover{color:var(--haven-gold)}

       /* ---- full-bleed cinematic hero: brand name as the whole event ---- */
       .sf-hero{position:relative;max-width:none;margin:0;padding:0 1.25rem;
         min-height:92dvh;display:flex;align-items:center;overflow:hidden;isolation:isolate;
         background:
           radial-gradient(85% 65% at 82% 108%, color-mix(in srgb,var(--haven-gold) 22%,transparent), transparent 60%),
           radial-gradient(120% 85% at 50% -12%, color-mix(in srgb,var(--brand) 38%,transparent), transparent 58%),
           linear-gradient(165deg, #10140c 0%, color-mix(in srgb,var(--brand) 46%,#10140c) 55%, #171b12 100%)}
       /* Real photo under the cinematic wash when demo assets are present. */
       .sf-hero--has-photo{background:transparent}
       .sf-hero--has-photo.sf-hero--centered::after{background:
         linear-gradient(180deg,rgba(12,16,10,.42) 0%,rgba(12,16,10,.62) 45%,rgba(12,16,10,.88) 100%),
         radial-gradient(90% 70% at 50% 100%, color-mix(in srgb,var(--brand) 35%,transparent), transparent 55%)}
       .sf-hero-media--bleed img{transform:scale(1.04);filter:saturate(1.05) contrast(1.05)}
       .sf-gallery-grid{gap:1rem}
       .sf-tile img{border-radius:calc(var(--r) + 4px);aspect-ratio:4/3;
         box-shadow:0 18px 40px -28px rgba(0,0,0,.35)}
       .sf-hero-atmosphere{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
       .sf-hero-atmosphere::before{content:'';position:absolute;inset:-10%;
         background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
         opacity:.05;mix-blend-mode:overlay}
       .sf-hero-atmosphere::after{content:attr(data-initial);position:absolute;left:50%;top:52%;
         transform:translate(-50%,-50%);font-family:var(--font-display);font-style:italic;font-weight:600;
         font-size:clamp(16rem,46vw,36rem);line-height:1;color:transparent;
         -webkit-text-stroke:1px color-mix(in srgb,var(--haven-ink) 10%,transparent);
         opacity:.4;user-select:none}
       .sf-hero-body{position:relative;z-index:1;max-width:var(--maxw);margin:0 auto;
         padding:clamp(6rem,15vw,9rem) 0 clamp(3.5rem,8vw,6rem);
         animation:sf-haven-rise .9s cubic-bezier(.16,1,.3,1) both}
       .sf-hero-title{font-weight:500;font-size:clamp(3rem,9vw,6.2rem);letter-spacing:-.01em;
         font-style:italic;color:var(--haven-ink);text-shadow:0 2px 30px rgba(0,0,0,.25)}
       .sf-hero-sub{max-width:36ch;font-size:clamp(1.05rem,2vw,1.25rem);
         color:color-mix(in srgb,var(--haven-ink) 76%,transparent);
         animation:sf-haven-rise .9s .14s cubic-bezier(.16,1,.3,1) both}
       .sf-hero-cta{animation:sf-haven-rise .9s .26s cubic-bezier(.16,1,.3,1) both}
       .sf-eyebrow{letter-spacing:.24em;font-weight:600}
       .sf-hero .sf-eyebrow{color:var(--haven-gold)}
       .sf-hero .sf-btn{transition:transform .45s cubic-bezier(.16,1,.3,1),filter .3s ease,background .3s ease}
       .sf-hero-cta .sf-btn--primary{border-radius:999px;padding:.9rem 1.85rem;letter-spacing:.03em;
         background:linear-gradient(135deg,#ecd6a4,var(--haven-gold));color:#20200f;border:0}
       .sf-hero-cta .sf-btn--primary:hover{transform:scale(1.045);filter:brightness(1.04)}
       .sf-hero-cta .sf-btn--ghost{border-radius:999px;
         border-color:color-mix(in srgb,var(--haven-ink) 32%,transparent);color:var(--haven-ink)}
       .sf-hero-cta .sf-btn--ghost:hover{transform:scale(1.045);border-color:var(--haven-ink)}
       .sf-hero :focus-visible{outline-color:var(--haven-gold)}

       /* ---- quiet, generous sections beneath the hero ---- */
       .sf-section{border-top:0;position:relative;
         padding-top:clamp(4.5rem,9vw,7.5rem);padding-bottom:clamp(4.5rem,9vw,7.5rem)}
       .sf-section-head{margin-bottom:2.75rem}
       .sf-section-head h2{font-weight:500;font-style:italic}

       /* ---- double-bezel service "islands": tinted shell + lifted inner core ---- */
       .sf-service{background:color-mix(in srgb,var(--brand) 11%,var(--surface));
         border:1px solid color-mix(in srgb,var(--brand) 16%,transparent);
         border-radius:calc(var(--r) + 10px);padding:.5rem;
         transition:transform .5s cubic-bezier(.16,1,.3,1),box-shadow .5s cubic-bezier(.16,1,.3,1);
         animation:sf-haven-fade .8s cubic-bezier(.16,1,.3,1) both}
       .sf-service:nth-of-type(1){animation-delay:.05s}
       .sf-service:nth-of-type(2){animation-delay:.16s}
       .sf-service:nth-of-type(3){animation-delay:.27s}
       .sf-service:nth-of-type(4){animation-delay:.38s}
       .sf-service:nth-of-type(5){animation-delay:.49s}
       .sf-service:nth-of-type(6){animation-delay:.6s}
       .sf-service:hover{transform:translateY(-4px);
         box-shadow:0 22px 44px -24px color-mix(in srgb,var(--brand) 45%,transparent)}
       .sf-service-inner{height:100%;background:var(--surface);border-radius:var(--r);
         padding:1.75rem 1.5rem;
         box-shadow:inset 0 1px 0 color-mix(in srgb,#fff 65%,transparent),
           0 1px 2px color-mix(in srgb,var(--ink) 5%,transparent)}
       .sf-service h3{font-family:var(--font-display);font-weight:600;font-size:1.4rem}
       .sf-btn{border-radius:999px}

       /* ---- booking-forward closing CTA ---- */
       .sf-contact-cta{margin:1.75rem 0 .5rem}
       .sf-contact-cta .sf-btn--primary{padding:.9rem 1.9rem;letter-spacing:.03em}

       @keyframes sf-haven-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
       @keyframes sf-haven-fade{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}

       /* Scroll-linked reveal for everything past the hero. Progressive
          enhancement only: browsers without view() timelines simply render
          sections in their normal, fully visible state. */
       @supports (animation-timeline: view()) {
         .sf-about,.sf-services,.sf-gallery,.sf-contact{
           animation:sf-haven-settle .8s cubic-bezier(.16,1,.3,1) both;
           animation-timeline:view();animation-range:entry 0% cover 30%}
         @keyframes sf-haven-settle{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
       }

       @media (max-width:640px){
         .sf-nav-inner{gap:1rem;padding:.55rem 1.1rem}
         .sf-nav a{font-size:.68rem;letter-spacing:.08em}
         .sf-hero-atmosphere::after{font-size:clamp(9rem,50vw,14rem)}
       }`
    );
  },
};
