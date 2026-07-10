import { esc, attr, jsonLdSafe, safeHref } from './html';
import type { SiteSpec, SiteImage, SectionSpec } from './spec';
import { contactHref, hrefFor, imgByRole, imgsByRole } from './spec';
import type { Theme } from './themes/types';
import type { HeroMode } from './composition/types';

// Semantic, accessible HTML builders shared by every theme. Themes style the
// stable `sf-` class names. Multi-page: each nav item is its own HTML file;
// Home is a landing with teasers; inner pages get a photo page-hero + body.

function pageTitle(spec: SiteSpec, pageId: string): string {
  const label = spec.sections.find((s) => s.id === pageId)?.label;
  if (pageId === 'home' || !label) return spec.business.name;
  return `${label} · ${spec.business.name}`;
}

function nav(spec: SiteSpec, currentId: string): string {
  const links = spec.sections
    .map((s) => {
      const current = s.id === currentId;
      return `<a href="${attr(s.href)}"${current ? ' aria-current="page" class="is-active"' : ''}>${esc(s.label)}</a>`;
    })
    .join('');
  const brandInner = spec.logo
    ? `<img class="sf-logo" src="${attr(spec.logo.src)}" alt="${attr(spec.logo.alt || spec.business.name)}" width="160" height="48" />`
    : esc(spec.business.name);
  return `<header class="sf-header">
  <a class="sf-skip" href="#main">Skip to content</a>
  <div class="sf-nav-inner">
    <a class="sf-brand${spec.logo ? ' sf-brand--logo' : ''}" href="index.html">${brandInner}</a>
    <nav class="sf-nav" aria-label="Primary">${links}</nav>
  </div>
</header>`;
}

function imgAt(spec: SiteSpec, index: number): SiteImage | undefined {
  if (!spec.images.length) return undefined;
  return spec.images[index % spec.images.length];
}

function heroMode(spec: SiteSpec, theme: Theme): HeroMode {
  return spec.composition?.hero ?? (theme.layout.hero as HeroMode);
}

function secondaryCta(spec: SiteSpec): { href: string; label: string } | null {
  const mode = spec.composition?.secondaryCta ?? 'about';
  if (mode === 'none') return null;
  const label =
    spec.content.secondaryCtaLabel ||
    (mode === 'services'
      ? `View ${spec.sections.find((s) => s.id === 'services')?.label?.toLowerCase() || 'services'}`
      : 'Our story');
  return { href: hrefFor(spec.sections, mode), label };
}

function pageHero(
  spec: SiteSpec,
  opts: { eyebrow?: string; title: string; lead: string; image?: SiteImage },
): string {
  const img = opts.image;
  const media = img
    ? `<div class="sf-page-hero-media" aria-hidden="true"><img src="${attr(img.src)}" alt="" loading="eager" width="1600" height="700" /></div>`
    : '';
  return `<section class="sf-page-hero${img ? ' sf-page-hero--has-photo' : ''}">
  ${media}
  <div class="sf-page-hero-body">
    ${opts.eyebrow ? `<p class="sf-eyebrow">${esc(opts.eyebrow)}</p>` : ''}
    <h1 class="sf-page-hero-title">${esc(opts.title)}</h1>
    <p class="sf-page-hero-lead">${esc(opts.lead)}</p>
  </div>
</section>`;
}

function homeHero(spec: SiteSpec, theme: Theme): string {
  const c = spec.content;
  const mode = heroMode(spec, theme);
  const img = imgByRole(spec, 'hero', 0);
  const brandFirst = spec.composition?.brandFirst ?? false;
  const brandIsHero =
    brandFirst || c.heroHeadline.trim().toLowerCase() === spec.business.name.trim().toLowerCase();
  const eyebrow = brandIsHero
    ? spec.business.tagline || spec.business.industry
    : spec.business.tagline
      ? spec.business.industry
      : '';
  const initial = spec.business.name.trim().charAt(0).toUpperCase();
  const sec = secondaryCta(spec);

  // Premium recipes force full-bleed / centered photo heroes (no side-card).
  const useBleed = (mode === 'full-bleed' || mode === 'centered') && img;
  const useSplit = mode === 'split' && img;
  const layoutClass = mode === 'full-bleed' ? 'centered' : mode;

  const fullBleedPhoto = useBleed
    ? `<div class="sf-hero-media sf-hero-media--bleed" aria-hidden="true"><img src="${attr(img!.src)}" alt="" loading="eager" width="1600" height="1000" /></div>`
    : '';
  const sideMedia = useSplit
    ? `<div class="sf-hero-media"><img src="${attr(img!.src)}" alt="${attr(img!.alt || spec.business.name)}" loading="eager" width="800" height="600" /></div>`
    : '';
  const atmosphere =
    mode === 'centered' || mode === 'full-bleed'
      ? `<div class="sf-hero-atmosphere" aria-hidden="true" data-initial="${attr(initial)}"></div>`
      : '';
  const trust = c.trustLine ? `<p class="sf-trust-line">${esc(c.trustLine)}</p>` : '';

  return `<section class="sf-hero sf-hero--${layoutClass}${useBleed ? ' sf-hero--has-photo' : ''}${mode === 'full-bleed' ? ' sf-hero--full-bleed-recipe' : ''}" id="home">
  ${fullBleedPhoto}
  ${atmosphere}
  <div class="sf-hero-body">
    ${eyebrow ? `<p class="sf-eyebrow">${esc(eyebrow)}</p>` : ''}
    <h1 class="sf-hero-title">${esc(c.heroHeadline)}</h1>
    <p class="sf-hero-sub">${esc(c.heroSub)}</p>
    ${trust}
    <div class="sf-hero-cta">
      <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
      ${sec ? `<a class="sf-btn sf-btn--ghost" href="${attr(sec.href)}">${esc(sec.label)}</a>` : ''}
    </div>
  </div>
  ${sideMedia}
</section>`;
}

function hasSection(spec: SiteSpec, id: string): boolean {
  return spec.sections.some((s) => s.id === id);
}

function testimonialsBand(spec: SiteSpec): string {
  const items = spec.content.testimonials ?? [];
  if (!items.length) return '';
  const cards = items
    .slice(0, 3)
    .map(
      (t) =>
        `<blockquote class="sf-quote"><p>${esc(t.quote)}</p><footer>${esc(t.attribution)}</footer></blockquote>`,
    )
    .join('');
  return `<section class="sf-section sf-testimonials">
  <div class="sf-section-head">
    <span class="sf-eyebrow">Voices</span>
    <h2>What people say</h2>
  </div>
  <div class="sf-quote-grid">${cards}</div>
</section>`;
}

function faqBand(spec: SiteSpec, asPage = false): string {
  const items = spec.content.faq ?? [];
  if (!items.length) return '';
  const rows = items
    .slice(0, 6)
    .map(
      (f) =>
        `<details class="sf-faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`,
    )
    .join('');
  const head = asPage
    ? ''
    : `<div class="sf-section-head"><span class="sf-eyebrow">FAQ</span><h2>Common questions</h2></div>`;
  return `<section class="sf-section sf-faq"${asPage ? ' id="faq"' : ''}>
  ${head}
  <div class="sf-faq-list">${rows}</div>
</section>`;
}

function homeTeasers(spec: SiteSpec): string {
  const parts: string[] = [];
  const c = spec.content;
  const order = spec.composition?.homeTeasers ?? ['services', 'about', 'gallery'];

  for (const teaser of order) {
    if (teaser === 'testimonials') {
      parts.push(testimonialsBand(spec));
      continue;
    }
    if (teaser === 'faq') {
      parts.push(faqBand(spec));
      continue;
    }
    if (teaser === 'services' && hasSection(spec, 'services') && c.services.length) {
      const href = hrefFor(spec.sections, 'services');
      const preview = c.services.slice(0, 3);
      const serviceImgs = imgsByRole(spec, 'service');
      const items = preview
        .map((s, i) => {
          const im = serviceImgs[i] || imgAt(spec, i + 1);
          const thumb = im
            ? `<div class="sf-teaser-media"><img src="${attr(im.src)}" alt="${attr(im.alt || s.name)}" loading="lazy" width="480" height="320" /></div>`
            : '';
          return `<article class="sf-teaser-card">${thumb}<div class="sf-teaser-copy"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p></div></article>`;
        })
        .join('');
      parts.push(`<section class="sf-section sf-teasers sf-teasers--services">
  <div class="sf-section-head">
    <span class="sf-eyebrow">Offerings</span>
    <h2>${esc(c.servicesTitle)}</h2>
    <p class="sf-section-lead">A taste of what we do — explore the full list.</p>
  </div>
  <div class="sf-teaser-grid">${items}</div>
  <p class="sf-teaser-more"><a class="sf-btn sf-btn--ghost" href="${attr(href)}">View all ${esc(spec.sections.find((s) => s.id === 'services')!.label.toLowerCase())}</a></p>
</section>`);
      continue;
    }
    if (teaser === 'about' && hasSection(spec, 'about')) {
      const href = hrefFor(spec.sections, 'about');
      const im = imgByRole(spec, 'about', Math.min(2, Math.max(0, spec.images.length - 1)));
      const media = im
        ? `<div class="sf-about-media"><img src="${attr(im.src)}" alt="${attr(im.alt || spec.business.name)}" loading="lazy" width="800" height="600" /></div>`
        : '';
      const blurb = c.aboutBody[0] || c.heroSub;
      parts.push(`<section class="sf-section sf-teasers sf-teasers--about">
  <div class="sf-about sf-about--split">
    <div class="sf-about-body">
      <span class="sf-eyebrow">About</span>
      <h2>${esc(c.aboutTitle)}</h2>
      <p>${esc(blurb)}</p>
      <p class="sf-teaser-more"><a class="sf-btn sf-btn--ghost" href="${attr(href)}">Our story</a></p>
    </div>
    ${media}
  </div>
</section>`);
      continue;
    }
    if (teaser === 'gallery' && hasSection(spec, 'gallery') && spec.images.length) {
      const href = hrefFor(spec.sections, 'gallery');
      const galleryImgs = imgsByRole(spec, 'gallery');
      const use = (galleryImgs.length ? galleryImgs : spec.images.slice(1, 5)).slice(0, 4);
      const tiles = use
        .map(
          (im) =>
            `<figure class="sf-tile"><img src="${attr(im.src)}" alt="${attr(im.alt || '')}" loading="lazy" width="600" height="450" /></figure>`,
        )
        .join('');
      parts.push(`<section class="sf-section sf-teasers sf-teasers--gallery">
  <div class="sf-section-head">
    <span class="sf-eyebrow">Gallery</span>
    <h2>A look inside</h2>
  </div>
  <div class="sf-gallery-grid sf-gallery-grid--teaser">${tiles}</div>
  <p class="sf-teaser-more"><a class="sf-btn sf-btn--ghost" href="${attr(href)}">See the gallery</a></p>
</section>`);
    }
  }

  const contact = contactHref(spec.sections);
  parts.push(`<section class="sf-section sf-home-cta">
  <div class="sf-home-cta-inner">
    <h2>${esc(c.ctaTitle)}</h2>
    <p>${esc(c.ctaBody)}</p>
    <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref || contact))}">${esc(c.heroCtaLabel)}</a>
  </div>
</section>`);

  return parts.filter(Boolean).join('\n');
}

function aboutPage(spec: SiteSpec): string {
  const c = spec.content;
  const banner = imgByRole(spec, 'about', 1) || imgByRole(spec, 'hero', 0);
  const side = imgByRole(spec, 'atmosphere', 2) || banner;
  const body = c.aboutBody.map((p) => `<p>${esc(p)}</p>`).join('');
  const highlights = c.highlights.length
    ? `<ul class="sf-highlights">${c.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>`
    : '';
  const media = side
    ? `<div class="sf-about-media"><img src="${attr(side.src)}" alt="${attr(side.alt || spec.business.name)}" loading="lazy" width="900" height="700" /></div>`
    : '';
  const quotes = testimonialsBand(spec);
  return `${pageHero(spec, {
    eyebrow: 'About',
    title: c.aboutTitle,
    lead: c.aboutBody[0] || c.heroSub,
    image: banner,
  })}
<section class="sf-section sf-about sf-about--split" id="about">
  <div class="sf-about-body">${body}${highlights}</div>
  ${media}
</section>
${quotes}`;
}

function servicesPage(spec: SiteSpec, theme: Theme): string {
  const c = spec.content;
  if (!c.services.length) return '';
  const banner = imgByRole(spec, 'service', 1) || imgByRole(spec, 'hero', 0);
  const label = spec.sections.find((s) => s.id === 'services')?.label || 'Services';
  const serviceImgs = imgsByRole(spec, 'service');
  const items = c.services
    .map((s, i) => {
      const im = serviceImgs[i] || imgAt(spec, i + 2);
      const thumb = im
        ? `<div class="sf-service-media"><img src="${attr(im.src)}" alt="${attr(im.alt || s.name)}" loading="lazy" width="640" height="420" /></div>`
        : '';
      return `<article class="sf-service sf-service--imaged"><div class="sf-service-inner">${thumb}<h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p></div></article>`;
    })
    .join('');
  return `${pageHero(spec, {
    eyebrow: 'Offerings',
    title: c.servicesTitle,
    lead: `Explore ${label.toLowerCase()} crafted for how you actually live.`,
    image: banner,
  })}
<section class="sf-section sf-services sf-services--${theme.layout.services}" id="services">
  <div class="sf-service-grid">${items}</div>
</section>`;
}

function galleryPage(spec: SiteSpec): string {
  const galleryImgs = imgsByRole(spec, 'gallery');
  let imgs = (galleryImgs.length ? galleryImgs : spec.images).slice(0, 12);
  if (imgs.length < 1) return '';
  const banner = imgByRole(spec, 'atmosphere', 0) || imgs[0];
  const tiles = imgs
    .map(
      (im, i) =>
        `<figure class="sf-tile${i === 0 ? ' sf-tile--feature' : ''}"><img src="${attr(im.src)}" alt="${attr(im.alt || '')}" loading="${i < 2 ? 'eager' : 'lazy'}" width="800" height="600" /></figure>`,
    )
    .join('');
  return `${pageHero(spec, {
    eyebrow: 'Gallery',
    title: 'A look inside',
    lead: 'Spaces, details, and the atmosphere we build for every visit.',
    image: banner,
  })}
<section class="sf-section sf-gallery" id="gallery">
  <div class="sf-gallery-grid sf-gallery-grid--rich">${tiles}</div>
</section>`;
}

function contactPage(spec: SiteSpec, _theme: Theme): string {
  const ct = spec.contact;
  const banner = imgByRole(spec, 'atmosphere', Math.max(0, spec.images.length - 1)) || spec.images[0];
  const rows: string[] = [];
  if (ct.address) rows.push(`<div class="sf-contact-row"><span>Visit</span><p>${esc(ct.address)}</p></div>`);
  if (ct.hours) rows.push(`<div class="sf-contact-row"><span>Hours</span><p>${esc(ct.hours)}</p></div>`);
  if (ct.phone)
    rows.push(
      `<div class="sf-contact-row"><span>Call</span><p><a href="tel:${attr(ct.phone.replace(/[^\d+]/g, ''))}">${esc(ct.phone)}</a></p></div>`,
    );
  if (ct.email)
    rows.push(
      `<div class="sf-contact-row"><span>Email</span><p><a href="mailto:${attr(ct.email)}">${esc(ct.email)}</a></p></div>`,
    );
  const socials = Object.entries(ct.socials || {})
    .map(([k, v]) => `<a href="${attr(safeHref(v))}" rel="noopener">${esc(k)}</a>`)
    .join('');
  const repeatCta = `<div class="sf-contact-cta"><a class="sf-btn sf-btn--primary" href="${attr(safeHref(spec.content.heroCtaHref))}">${esc(spec.content.heroCtaLabel)}</a></div>`;
  return `${pageHero(spec, {
    eyebrow: 'Contact',
    title: spec.content.ctaTitle,
    lead: spec.content.ctaBody,
    image: banner,
  })}
<section class="sf-section sf-contact" id="contact">
  ${repeatCta}
  <div class="sf-contact-grid">${rows.join('')}</div>
  ${socials ? `<div class="sf-socials">${socials}</div>` : ''}
</section>`;
}

function teamPage(spec: SiteSpec): string {
  const team = spec.content.team ?? [];
  const banner = imgByRole(spec, 'about', 0) || spec.images[0];
  if (!team.length) {
    return `${pageHero(spec, {
      eyebrow: 'Team',
      title: 'Our people',
      lead: `The humans behind ${spec.business.name}.`,
      image: banner,
    })}
<section class="sf-section"><p class="sf-section-lead">Team profiles coming soon.</p></section>`;
  }
  const cards = team
    .map(
      (m) =>
        `<article class="sf-team-card"><h3>${esc(m.name)}</h3><p class="sf-team-role">${esc(m.role)}</p>${m.bio ? `<p>${esc(m.bio)}</p>` : ''}</article>`,
    )
    .join('');
  return `${pageHero(spec, {
    eyebrow: 'Team',
    title: 'Our people',
    lead: `The humans behind ${spec.business.name}.`,
    image: banner,
  })}
<section class="sf-section sf-team" id="team">
  <div class="sf-team-grid">${cards}</div>
</section>`;
}

function faqPage(spec: SiteSpec): string {
  const banner = imgByRole(spec, 'atmosphere', 0) || spec.images[0];
  return `${pageHero(spec, {
    eyebrow: 'FAQ',
    title: 'Questions, answered',
    lead: 'Straight answers so you can decide with confidence.',
    image: banner,
  })}
${faqBand(spec, true)}`;
}

function givePage(spec: SiteSpec): string {
  const banner = imgByRole(spec, 'atmosphere', 0) || spec.images[0];
  const href = safeHref(spec.content.heroCtaHref);
  return `${pageHero(spec, {
    eyebrow: 'Give',
    title: spec.content.ctaTitle || 'Partner with us',
    lead: spec.content.ctaBody || 'Your generosity fuels the mission.',
    image: banner,
  })}
<section class="sf-section sf-give" id="give">
  <div class="sf-home-cta-inner">
    <a class="sf-btn sf-btn--primary" href="${attr(href)}">${esc(spec.content.heroCtaLabel || 'Give')}</a>
  </div>
</section>`;
}

function visitPage(spec: SiteSpec): string {
  const ct = spec.contact;
  const banner = imgByRole(spec, 'hero', 0) || spec.images[0];
  const rows: string[] = [];
  if (ct.address) rows.push(`<div class="sf-contact-row"><span>Address</span><p>${esc(ct.address)}</p></div>`);
  if (ct.hours) rows.push(`<div class="sf-contact-row"><span>Gathering times</span><p>${esc(ct.hours)}</p></div>`);
  if (ct.phone)
    rows.push(
      `<div class="sf-contact-row"><span>Call</span><p><a href="tel:${attr(ct.phone.replace(/[^\d+]/g, ''))}">${esc(ct.phone)}</a></p></div>`,
    );
  return `${pageHero(spec, {
    eyebrow: 'Visit',
    title: 'Plan your visit',
    lead: 'We would love to welcome you.',
    image: banner,
  })}
<section class="sf-section sf-contact" id="visit">
  <div class="sf-contact-grid">${rows.join('')}</div>
  <div class="sf-contact-cta" style="margin-top:1.5rem"><a class="sf-btn sf-btn--primary" href="${attr(safeHref(spec.content.heroCtaHref))}">${esc(spec.content.heroCtaLabel)}</a></div>
</section>`;
}

function stickyCta(spec: SiteSpec): string {
  if (!spec.composition?.stickyCta) return '';
  const c = spec.content;
  return `<div class="sf-sticky-cta" role="region" aria-label="Quick action">
  <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
</div>`;
}

function footer(spec: SiteSpec): string {
  const year = new Date().getFullYear();
  return `<footer class="sf-footer">
  <p>&copy; ${year} ${esc(spec.business.name)}. All rights reserved.</p>
  <p class="sf-footer-by">Forged with SiteForge</p>
</footer>`;
}

// JSON-LD structured data + OG tags improve the SEO Lighthouse score.
export function headMeta(spec: SiteSpec, pageId = 'home'): string {
  const descText =
    pageId === 'home'
      ? spec.content.heroSub ||
        spec.business.tagline ||
        spec.content.aboutBody[0] ||
        `${spec.business.name} — ${spec.business.industry}`
      : `${pageTitle(spec, pageId)} — ${spec.content.heroSub || spec.business.tagline || spec.business.industry}`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: spec.business.name,
    description: spec.content.heroSub || spec.business.tagline || descText,
    ...(spec.contact.phone ? { telephone: spec.contact.phone } : {}),
    ...(spec.contact.email ? { email: spec.contact.email } : {}),
    ...(spec.contact.address ? { address: spec.contact.address } : {}),
  };
  const desc = esc(descText);
  const ogImg = imgByRole(spec, 'hero', 0);
  return `<meta name="description" content="${desc}" />
<meta property="og:title" content="${esc(pageTitle(spec, pageId))}" />
<meta property="og:description" content="${desc}" />
<meta property="og:type" content="website" />
${ogImg ? `<meta property="og:image" content="${attr(safeHref(ogImg.src))}" />` : ''}
<script type="application/ld+json">${jsonLdSafe(ld)}</script>`;
}

function pageMain(spec: SiteSpec, theme: Theme, pageId: string): string {
  switch (pageId) {
    case 'home':
      return homeHero(spec, theme) + '\n' + homeTeasers(spec);
    case 'about':
      return aboutPage(spec);
    case 'services':
      return servicesPage(spec, theme);
    case 'gallery':
      return galleryPage(spec);
    case 'contact':
      return contactPage(spec, theme);
    case 'team':
      return teamPage(spec);
    case 'faq':
      return faqPage(spec);
    case 'give':
      return givePage(spec);
    case 'visit':
      return visitPage(spec);
    default:
      return '';
  }
}

/** Assemble <body> for a single page in the multi-page bundle. */
export function renderBody(spec: SiteSpec, theme: Theme, pageId: string): string {
  const main = pageMain(spec, theme, pageId);
  return [nav(spec, pageId), `<main id="main">`, main, `</main>`, stickyCta(spec), footer(spec)].join(
    '\n',
  );
}

export function documentTitle(spec: SiteSpec, pageId: string): string {
  return pageTitle(spec, pageId);
}

export function pagesToRender(spec: SiteSpec): SectionSpec[] {
  const out = [...spec.sections];
  if (!out.some((s) => s.id === 'gallery') && spec.images.length >= 2) {
    out.push({ id: 'gallery', label: 'Gallery', file: 'gallery.html', href: 'gallery.html' });
  }
  return out;
}
