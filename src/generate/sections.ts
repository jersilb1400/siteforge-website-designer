import { esc, attr, jsonLdSafe, safeHref } from './html';
import type { SiteSpec } from './spec';
import type { Theme } from './themes/types';

// Semantic, accessible HTML section builders shared by every theme. Themes style
// the stable `sf-` class names. Order is driven by SiteSpec.sections.

function nav(spec: SiteSpec): string {
  const links = spec.sections
    .map((s) => `<a href="#${esc(s.id)}">${esc(s.label)}</a>`)
    .join('');
  return `<header class="sf-header">
  <a class="sf-skip" href="#main">Skip to content</a>
  <div class="sf-nav-inner">
    <a class="sf-brand" href="#home">${esc(spec.business.name)}</a>
    <nav class="sf-nav" aria-label="Primary">${links}</nav>
  </div>
</header>`;
}

function hero(spec: SiteSpec, theme: Theme): string {
  const c = spec.content;
  const img = spec.images[0];
  const media =
    theme.layout.hero !== 'centered' && img
      ? `<div class="sf-hero-media"><img src="${attr(img.src)}" alt="${attr(img.alt || spec.business.name)}" loading="eager" width="800" height="600" /></div>`
      : '';
  return `<section class="sf-hero sf-hero--${theme.layout.hero}" id="home">
  <div class="sf-hero-body">
    ${spec.business.tagline ? `<p class="sf-eyebrow">${esc(spec.business.industry)}</p>` : ''}
    <h1 class="sf-hero-title">${esc(c.heroHeadline)}</h1>
    <p class="sf-hero-sub">${esc(c.heroSub)}</p>
    <div class="sf-hero-cta">
      <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
      <a class="sf-btn sf-btn--ghost" href="#about">Learn more</a>
    </div>
  </div>
  ${media}
</section>`;
}

function about(spec: SiteSpec): string {
  const c = spec.content;
  const body = c.aboutBody.map((p) => `<p>${esc(p)}</p>`).join('');
  const highlights = c.highlights.length
    ? `<ul class="sf-highlights">${c.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>`
    : '';
  return `<section class="sf-section sf-about" id="about">
  <div class="sf-section-head"><span class="sf-eyebrow">About</span><h2>${esc(c.aboutTitle)}</h2></div>
  <div class="sf-about-body">${body}${highlights}</div>
</section>`;
}

function services(spec: SiteSpec, theme: Theme): string {
  const c = spec.content;
  if (!c.services.length) return '';
  const items = c.services
    .map(
      (s) => `<article class="sf-service"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p></article>`,
    )
    .join('');
  return `<section class="sf-section sf-services sf-services--${theme.layout.services}" id="services">
  <div class="sf-section-head"><span class="sf-eyebrow">Offerings</span><h2>${esc(c.servicesTitle)}</h2></div>
  <div class="sf-service-grid">${items}</div>
</section>`;
}

function gallery(spec: SiteSpec): string {
  const imgs = spec.images.slice(1, 7);
  if (imgs.length < 2) return '';
  const tiles = imgs
    .map(
      (im) =>
        `<figure class="sf-tile"><img src="${attr(im.src)}" alt="${attr(im.alt || '')}" loading="lazy" width="600" height="450" /></figure>`,
    )
    .join('');
  return `<section class="sf-section sf-gallery" id="gallery">
  <div class="sf-section-head"><span class="sf-eyebrow">Gallery</span><h2>A look inside</h2></div>
  <div class="sf-gallery-grid">${tiles}</div>
</section>`;
}

function contact(spec: SiteSpec): string {
  const ct = spec.contact;
  const rows: string[] = [];
  if (ct.address) rows.push(`<div class="sf-contact-row"><span>Visit</span><p>${esc(ct.address)}</p></div>`);
  if (ct.hours) rows.push(`<div class="sf-contact-row"><span>Hours</span><p>${esc(ct.hours)}</p></div>`);
  if (ct.phone) rows.push(`<div class="sf-contact-row"><span>Call</span><p><a href="tel:${attr(ct.phone.replace(/[^\d+]/g, ''))}">${esc(ct.phone)}</a></p></div>`);
  if (ct.email) rows.push(`<div class="sf-contact-row"><span>Email</span><p><a href="mailto:${attr(ct.email)}">${esc(ct.email)}</a></p></div>`);
  const socials = Object.entries(ct.socials || {})
    .map(([k, v]) => `<a href="${attr(safeHref(v))}" rel="noopener">${esc(k)}</a>`)
    .join('');
  return `<section class="sf-section sf-contact" id="contact">
  <div class="sf-section-head"><span class="sf-eyebrow">Contact</span><h2>${esc(spec.content.ctaTitle)}</h2></div>
  <p class="sf-contact-lead">${esc(spec.content.ctaBody)}</p>
  <div class="sf-contact-grid">${rows.join('')}</div>
  ${socials ? `<div class="sf-socials">${socials}</div>` : ''}
</section>`;
}

function footer(spec: SiteSpec): string {
  const year = new Date().getFullYear();
  return `<footer class="sf-footer">
  <p>&copy; ${year} ${esc(spec.business.name)}. All rights reserved.</p>
  <p class="sf-footer-by">Forged with SiteForge</p>
</footer>`;
}

// JSON-LD structured data + OG tags improve the SEO Lighthouse score.
export function headMeta(spec: SiteSpec): string {
  // Fall back so the description meta is never empty (SEO).
  const descText =
    spec.content.heroSub ||
    spec.business.tagline ||
    spec.content.aboutBody[0] ||
    `${spec.business.name} — ${spec.business.industry}`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: spec.business.name,
    description: descText,
    ...(spec.contact.phone ? { telephone: spec.contact.phone } : {}),
    ...(spec.contact.email ? { email: spec.contact.email } : {}),
    ...(spec.contact.address ? { address: spec.contact.address } : {}),
  };
  const desc = esc(descText);
  return `<meta name="description" content="${desc}" />
<meta property="og:title" content="${esc(spec.business.name)}" />
<meta property="og:description" content="${desc}" />
<meta property="og:type" content="website" />
${spec.images[0] ? `<meta property="og:image" content="${attr(safeHref(spec.images[0].src))}" />` : ''}
<script type="application/ld+json">${jsonLdSafe(ld)}</script>`;
}

// Assemble the full <body> content in section order.
export function renderBody(spec: SiteSpec, theme: Theme): string {
  const byId: Record<string, () => string> = {
    home: () => hero(spec, theme),
    about: () => about(spec),
    services: () => services(spec, theme),
    gallery: () => gallery(spec),
    contact: () => contact(spec),
  };
  const rendered = new Set<string>();
  const parts = [nav(spec), '<main id="main">'];
  for (const s of spec.sections) {
    if (rendered.has(s.id) || !byId[s.id]) continue;
    parts.push(byId[s.id]!());
    rendered.add(s.id);
  }
  // Ensure gallery appears if we have images even when not in nav.
  if (!rendered.has('gallery')) {
    const g = gallery(spec);
    if (g) parts.push(g);
  }
  parts.push('</main>', footer(spec));
  return parts.join('\n');
}
