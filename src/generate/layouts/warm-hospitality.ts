import { esc, attr, safeHref } from '../html';
import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';
import { imgByRole, imgsByRole, hrefFor } from '../spec';
import type { LayoutRenderer } from './types';
import { sharedTestimonials, sharedHomeCta, sharedPageHero } from './shared';

function magazineHero(spec: SiteSpec): string {
  const c = spec.content;
  const img = imgByRole(spec, 'hero', 0);
  const media = img
    ? `<div class="sf-hero-media-fill" aria-hidden="true"><img src="${attr(img.src)}" alt="" loading="eager" width="1600" height="1000" /></div>`
    : '';
  const secHref = hrefFor(spec.sections, spec.composition?.secondaryCta ?? 'services');
  const sec =
    spec.composition?.secondaryCta !== 'none'
      ? `<a class="sf-btn sf-btn--ghost" href="${attr(secHref)}">${esc(c.secondaryCtaLabel || 'View Menu')}</a>`
      : '';
  return `<section class="sf-hero sf-hero--magazine-bottom" id="home">
  ${media}
  <div class="sf-hero-magazine-bar">
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

function bentoHome(spec: SiteSpec): string {
  const c = spec.content;
  const heroImg = imgByRole(spec, 'atmosphere', 0) || imgByRole(spec, 'gallery', 0);
  const atmosImg = imgByRole(spec, 'gallery', 1);
  const service0 = c.services[0];
  const service1 = c.services[1];
  const featureMedia = heroImg
    ? `<img src="${attr(heroImg.src)}" alt="${attr(heroImg.alt || spec.business.name)}" loading="lazy" width="800" height="800" />`
    : '';
  const tile2Media = atmosImg
    ? `<img src="${attr(atmosImg.src)}" alt="${attr(atmosImg.alt || '')}" loading="lazy" width="600" height="400" />`
    : '';
  return `<section class="sf-section sf-bento-home">
  <div class="sf-section-head">
    <span class="sf-eyebrow">Offerings</span>
    <h2>${esc(c.servicesTitle)}</h2>
  </div>
  <div class="sf-bento-grid">
    <div class="sf-bento-feature">${featureMedia}</div>
    ${service0 ? `<div class="sf-bento-tile sf-bento-tile--dark"><h3>${esc(service0.name)}</h3><p>${esc(service0.desc)}</p></div>` : ''}
    ${service1 ? `<div class="sf-bento-tile"><span class="sf-eyebrow">Also</span><h3>${esc(service1.name)}</h3><p>${esc(service1.desc)}</p></div>` : ''}
    <div class="sf-bento-tile sf-bento-tile--media">${tile2Media}</div>
  </div>
</section>`;
}

export const warmHospitalityRenderer: LayoutRenderer = {
  homeContent(spec, _theme) {
    const parts: string[] = [magazineHero(spec)];
    const order = spec.composition?.homeTeasers ?? ['services', 'gallery', 'about', 'testimonials'];
    for (const t of order) {
      if (t === 'services') parts.push(bentoHome(spec));
      else if (t === 'testimonials') parts.push(sharedTestimonials(spec));
    }
    parts.push(sharedHomeCta(spec));
    return parts.filter(Boolean).join('\n');
  },

  servicesContent(spec, _theme) {
    const c = spec.content;
    const banner = imgByRole(spec, 'hero', 0);
    const serviceImgs = imgsByRole(spec, 'service');
    const items = c.services
      .map((s, i) => {
        const im = serviceImgs[i];
        const thumb = im
          ? `<div class="sf-service-media"><img src="${attr(im.src)}" alt="${attr(im.alt || s.name)}" loading="lazy" width="640" height="420" /></div>`
          : '';
        return `<article class="sf-service sf-service--imaged"><div class="sf-service-inner">${thumb}<h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p></div></article>`;
      })
      .join('');
    return `${sharedPageHero(spec, {
      eyebrow: 'Menu & Offerings',
      title: c.servicesTitle,
      lead: 'Crafted with care, served with warmth.',
      image: banner,
    })}
<section class="sf-section sf-services sf-services--grid" id="services">
  <div class="sf-service-grid">${items}</div>
</section>`;
  },
};
