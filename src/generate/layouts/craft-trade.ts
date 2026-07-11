import { esc, attr, safeHref } from '../html';
import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';
import { imgByRole, imgsByRole, hrefFor } from '../spec';
import type { LayoutRenderer } from './types';
import { sharedTestimonials, sharedHomeCta, sharedPageHero, sharedFaq } from './shared';

function industrialHero(spec: SiteSpec): string {
  const c = spec.content;
  const img = imgByRole(spec, 'hero', 0);
  const media = img
    ? `<div class="sf-hero-media-fill" aria-hidden="true"><img src="${attr(img.src)}" alt="" loading="eager" width="1600" height="1000" /></div>`
    : '';
  const sinceText = spec.business.industry ?? '';
  const projectCount = (c.highlights ?? []).find((h) =>
    /\d+\+?\s*(project|job|client)/i.test(h),
  );
  const countParts = projectCount?.match(/^([\d+]+)\+?\s+(.*)/);
  const countBlock = countParts
    ? `<div class="sf-hero-project-count"><span class="sf-count-num">${esc(countParts[1]!)}+</span><span class="sf-count-label">${esc(countParts[2]!)}</span></div>`
    : '';
  return `<section class="sf-hero sf-hero--industrial" id="home">
  ${media}
  <div class="sf-hero--industrial-overlay" aria-hidden="true"></div>
  <div class="sf-hero-body">
    ${sinceText ? `<p class="sf-eyebrow">${esc(sinceText)}</p>` : ''}
    <h1 class="sf-hero-title">${esc(c.heroHeadline)}</h1>
    <p class="sf-hero-sub">${esc(c.heroSub)}</p>
    ${countBlock}
    <div class="sf-hero-cta">
      <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
      <a class="sf-btn sf-btn--ghost" href="${attr(hrefFor(spec.sections, 'services'))}">Our work</a>
    </div>
  </div>
</section>`;
}

function portfolioGrid(spec: SiteSpec): string {
  const c = spec.content;
  const serviceImgs = imgsByRole(spec, 'service');
  const galleryImgs = imgsByRole(spec, 'gallery');
  const allImgs = [...serviceImgs, ...galleryImgs];
  if (!allImgs.length) return '';
  const items = c.services
    .slice(0, 4)
    .map((s, i) => {
      const img = allImgs[i];
      if (!img) return '';
      const featured = i === 0 ? ' sf-portfolio-item--featured' : '';
      return `<article class="sf-portfolio-item${featured}">
  <img src="${attr(img.src)}" alt="${attr(img.alt || s.name)}" loading="${i === 0 ? 'eager' : 'lazy'}" width="800" height="600" />
  <div class="sf-portfolio-label"><h3>${esc(s.name)}</h3><p>${esc(s.desc.substring(0, 80))}${s.desc.length > 80 ? '…' : ''}</p></div>
</article>`;
    })
    .filter(Boolean)
    .join('');
  if (!items) return '';
  return `<section class="sf-section sf-portfolio-section">
  <div class="sf-section-head">
    <span class="sf-eyebrow">Our Work</span>
    <h2>${esc(c.servicesTitle)}</h2>
  </div>
  <div class="sf-portfolio-grid">${items}</div>
</section>`;
}

export const craftTradeRenderer: LayoutRenderer = {
  homeContent(spec, _theme) {
    const parts: string[] = [industrialHero(spec)];
    const order = spec.composition?.homeTeasers ?? ['services', 'gallery', 'testimonials', 'about'];
    for (const t of order) {
      if (t === 'services') parts.push(portfolioGrid(spec));
      else if (t === 'testimonials') parts.push(sharedTestimonials(spec));
      else if (t === 'faq') parts.push(sharedFaq(spec));
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
      eyebrow: 'Services',
      title: c.servicesTitle,
      lead: 'Quality work, on time and on budget.',
      image: banner,
    })}
<section class="sf-section sf-services sf-services--grid" id="services">
  <div class="sf-service-grid">${items}</div>
</section>`;
  },
};
