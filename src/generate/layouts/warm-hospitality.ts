import { esc, attr, safeHref } from '../html';
import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';
import { imgByRole, imgsByRole, hrefFor } from '../spec';
import type { LayoutRenderer } from './types';
import { sharedTestimonials, sharedHomeCta, sharedPageHero } from './shared';

/** Magazine bottom bar on full-bleed food photography. */
function magazineHero(spec: SiteSpec): string {
  const c = spec.content;
  const img = imgByRole(spec, 'hero', 0);
  const media = img
    ? `<div class="sf-hero-media-fill" aria-hidden="true"><img src="${attr(img.src)}" alt="" loading="eager" width="1600" height="1000" /></div>`
    : '';
  const secHref = hrefFor(spec.sections, spec.composition?.secondaryCta ?? 'services');
  const sec =
    spec.composition?.secondaryCta !== 'none'
      ? `<a class="sf-btn sf-btn--ghost" href="${attr(secHref)}">${esc(c.secondaryCtaLabel || 'View menu')}</a>`
      : '';
  return `<section class="sf-hero sf-hero--magazine-bottom" id="home">
  ${media}
  <div class="sf-hero-magazine-bar sf-reveal">
    <p class="sf-barely-brand">${esc(spec.business.name)}</p>
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

/** Dense tactile bento — feature + mixed media/copy tiles. */
function tactileBento(spec: SiteSpec): string {
  const c = spec.content;
  const gallery = imgsByRole(spec, 'gallery');
  const services = imgsByRole(spec, 'service');
  const atmos = imgByRole(spec, 'atmosphere', 0);
  const featureImg = atmos || gallery[0] || services[0];
  const tiles: string[] = [];

  if (featureImg) {
    tiles.push(
      `<div class="sf-bento-feature sf-reveal"><img src="${attr(featureImg.src)}" alt="${attr(featureImg.alt || spec.business.name)}" loading="lazy" width="900" height="900" /></div>`,
    );
  }

  c.services.slice(0, 3).forEach((s, i) => {
    const dark = i === 0 ? ' sf-bento-tile--dark' : '';
    tiles.push(
      `<div class="sf-bento-tile${dark} sf-reveal" style="--sf-delay:${(i + 1) * 70}ms"><span class="sf-eyebrow">${esc(c.servicesTitle)}</span><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p></div>`,
    );
  });

  const mediaImgs = [...services, ...gallery].slice(0, 3);
  mediaImgs.forEach((im, i) => {
    tiles.push(
      `<div class="sf-bento-tile sf-bento-tile--media sf-reveal" style="--sf-delay:${(i + 4) * 70}ms"><img src="${attr(im.src)}" alt="${attr(im.alt || '')}" loading="lazy" width="600" height="400" /></div>`,
    );
  });

  if ((c.highlights ?? []).length) {
    const bits = (c.highlights ?? [])
      .slice(0, 3)
      .map((h) => `<li>${esc(h)}</li>`)
      .join('');
    tiles.push(
      `<div class="sf-bento-tile sf-bento-tile--tactile sf-reveal"><span class="sf-eyebrow">Why us</span><ul class="sf-bento-highlights">${bits}</ul></div>`,
    );
  }

  return `<section class="sf-section sf-bento-home sf-bento-home--tactile">
  <div class="sf-section-head sf-reveal">
    <span class="sf-eyebrow">The table</span>
    <h2>${esc(c.servicesTitle)}</h2>
  </div>
  <div class="sf-bento-grid sf-bento-grid--tactile">${tiles.join('\n')}</div>
  <p class="sf-teaser-more sf-reveal"><a class="sf-btn sf-btn--ghost" href="${attr(hrefFor(spec.sections, 'services'))}">Full menu</a></p>
</section>`;
}

export const warmHospitalityRenderer: LayoutRenderer = {
  homeContent(spec, _theme) {
    const parts: string[] = [magazineHero(spec)];
    const order = spec.composition?.homeTeasers ?? ['services', 'gallery', 'about', 'testimonials'];
    for (const t of order) {
      if (t === 'services') parts.push(tactileBento(spec));
      else if (t === 'testimonials') parts.push(sharedTestimonials(spec));
    }
    parts.push(sharedHomeCta(spec));
    return parts.filter(Boolean).join('\n');
  },

  servicesContent(spec, _theme: Theme) {
    const c = spec.content;
    const banner = imgByRole(spec, 'hero', 0);
    const serviceImgs = imgsByRole(spec, 'service');
    const items = c.services
      .map((s, i) => {
        const im = serviceImgs[i];
        const thumb = im
          ? `<div class="sf-service-media"><img src="${attr(im.src)}" alt="${attr(im.alt || s.name)}" loading="lazy" width="640" height="420" /></div>`
          : '';
        return `<article class="sf-service sf-service--imaged sf-reveal" style="--sf-delay:${i * 60}ms"><div class="sf-service-inner">${thumb}<h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p></div></article>`;
      })
      .join('');
    return `${sharedPageHero(spec, {
      eyebrow: 'Menu',
      title: c.servicesTitle,
      lead: 'Seasonal plates, made fresh.',
      image: banner,
    })}
<section class="sf-section sf-services sf-services--grid" id="services">
  <div class="sf-service-grid">${items}</div>
</section>`;
  },
};
