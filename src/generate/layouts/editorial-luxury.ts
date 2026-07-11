import { esc, attr, safeHref } from '../html';
import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';
import { imgByRole, imgsByRole, hrefFor } from '../spec';
import type { LayoutRenderer } from './types';
import { sharedTestimonials, sharedHomeCta, sharedPageHero, sharedFaq } from './shared';

function editorialHero(spec: SiteSpec): string {
  const c = spec.content;
  const img = imgByRole(spec, 'hero', 0);
  const media = img
    ? `<div class="sf-hero-media-fill" aria-hidden="true"><img src="${attr(img.src)}" alt="" loading="eager" width="1600" height="1000" /></div>`
    : '';
  const secHref = hrefFor(spec.sections, spec.composition?.secondaryCta ?? 'services');
  const sec =
    spec.composition?.secondaryCta !== 'none'
      ? `<a class="sf-btn sf-btn--ghost" href="${attr(secHref)}">${esc(c.secondaryCtaLabel || 'Our Services')}</a>`
      : '';
  return `<section class="sf-hero sf-hero--editorial-panel" id="home">
  ${media}
  <div class="sf-hero-editorial-panel">
    ${spec.business.tagline ? `<p class="sf-eyebrow">${esc(spec.business.tagline)}</p>` : ''}
    <h1 class="sf-hero-title">${esc(c.heroHeadline)}</h1>
    <p class="sf-hero-sub">${esc(c.heroSub)}</p>
    <div class="sf-hero-cta">
      <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
      ${sec}
    </div>
  </div>
</section>`;
}

function editorialSpreads(spec: SiteSpec): string {
  const c = spec.content;
  const serviceImgs = imgsByRole(spec, 'service');
  if (!c.services.length) return '';
  const spreads = c.services
    .slice(0, 3)
    .map((s, i) => {
      const img = serviceImgs[i] || imgByRole(spec, 'gallery', i);
      const media = img
        ? `<div class="sf-spread-media"><img src="${attr(img.src)}" alt="${attr(img.alt || s.name)}" loading="lazy" width="800" height="600" /></div>`
        : `<div class="sf-spread-media" style="background:var(--surface)"></div>`;
      return `<article class="sf-section sf-editorial-spread">
  ${media}
  <div class="sf-spread-body">
    <span class="sf-eyebrow">Offering</span>
    <h3>${esc(s.name)}</h3>
    <p>${esc(s.desc)}</p>
    <a class="sf-btn sf-btn--ghost" href="${attr(hrefFor(spec.sections, 'services'))}">Explore all services</a>
  </div>
</article>`;
    })
    .join('\n');
  return `<div class="sf-editorial-spreads" aria-label="${esc(c.servicesTitle)}">${spreads}</div>`;
}

function editorialAboutBand(spec: SiteSpec): string {
  const c = spec.content;
  if (!spec.sections.some((s) => s.id === 'about')) return '';
  const img = imgByRole(spec, 'about', 0);
  const media = img
    ? `<div class="sf-spread-media"><img src="${attr(img.src)}" alt="${attr(img.alt || spec.business.name)}" loading="lazy" width="800" height="600" /></div>`
    : '';
  const blurb = c.aboutBody[0] || c.heroSub;
  return `<article class="sf-section sf-editorial-spread">
  ${media}
  <div class="sf-spread-body">
    <span class="sf-eyebrow">About</span>
    <h2>${esc(c.aboutTitle)}</h2>
    <p>${esc(blurb)}</p>
    <a class="sf-btn sf-btn--ghost" href="${attr(hrefFor(spec.sections, 'about'))}">Our story</a>
  </div>
</article>`;
}

export const editorialLuxuryRenderer: LayoutRenderer = {
  homeContent(spec, _theme) {
    const parts: string[] = [editorialHero(spec)];
    const order = spec.composition?.homeTeasers ?? ['services', 'testimonials', 'about'];
    for (const t of order) {
      if (t === 'services') parts.push(editorialSpreads(spec));
      else if (t === 'about') parts.push(editorialAboutBand(spec));
      else if (t === 'testimonials') parts.push(sharedTestimonials(spec));
      else if (t === 'faq') parts.push(sharedFaq(spec));
    }
    parts.push(sharedHomeCta(spec));
    return parts.filter(Boolean).join('\n');
  },

  servicesContent(spec, _theme) {
    const c = spec.content;
    const banner = imgByRole(spec, 'service', 0) || imgByRole(spec, 'hero', 0);
    const label = spec.sections.find((s) => s.id === 'services')?.label || 'Services';
    const serviceImgs = imgsByRole(spec, 'service');
    const spreads = c.services
      .map((s, i) => {
        const img = serviceImgs[i];
        const media = img
          ? `<div class="sf-spread-media"><img src="${attr(img.src)}" alt="${attr(img.alt || s.name)}" loading="lazy" width="800" height="600" /></div>`
          : `<div class="sf-spread-media" style="background:var(--surface)"></div>`;
        return `<article class="sf-section sf-editorial-spread">
  ${media}
  <div class="sf-spread-body">
    <h3>${esc(s.name)}</h3>
    <p>${esc(s.desc)}</p>
    <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
  </div>
</article>`;
      })
      .join('\n');
    return `${sharedPageHero(spec, {
      eyebrow: 'Offerings',
      title: c.servicesTitle,
      lead: `Every ${label.toLowerCase().replace(/s$/, '')} crafted for you.`,
      image: banner,
    })}
<div class="sf-editorial-spreads" id="services">${spreads}</div>`;
  },
};
