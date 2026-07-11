import { esc, attr, safeHref } from '../html';
import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';
import { imgByRole, imgsByRole, hrefFor } from '../spec';
import type { LayoutRenderer } from './types';
import { sharedTestimonials, sharedHomeCta, sharedPageHero, sharedFaq } from './shared';

function statSplitHero(spec: SiteSpec): string {
  const c = spec.content;
  const img = imgByRole(spec, 'hero', 0) || imgByRole(spec, 'about', 0);
  const media = img
    ? `<div class="sf-hero-media"><img src="${attr(img.src)}" alt="${attr(img.alt || spec.business.name)}" loading="eager" width="800" height="1000" /></div>`
    : '';
  const trust = c.trustLine ? `<p class="sf-trust-line">${esc(c.trustLine)}</p>` : '';
  const stats = (c.highlights ?? [])
    .slice(0, 2)
    .map((h) => {
      const match = h.match(/^([\d.,]+[%+MK]?)\s+(.*)/);
      if (match) {
        return `<div class="sf-stat"><span class="sf-stat-num">${esc(match[1]!)}</span><span class="sf-stat-label">${esc(match[2]!)}</span></div>`;
      }
      return '';
    })
    .join('');
  return `<section class="sf-hero sf-hero--stat-split" id="home">
  <div class="sf-hero-body">
    ${spec.business.industry ? `<p class="sf-eyebrow">${esc(spec.business.industry)}</p>` : ''}
    <h1 class="sf-hero-title">${esc(c.heroHeadline)}</h1>
    <p class="sf-hero-sub">${esc(c.heroSub)}</p>
    ${trust}
    ${stats ? `<div class="sf-hero-stats">${stats}</div>` : ''}
    <div class="sf-hero-cta">
      <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
      <a class="sf-btn sf-btn--ghost" href="${attr(hrefFor(spec.sections, 'about'))}">Learn more</a>
    </div>
  </div>
  ${media}
</section>`;
}

function numberedServices(spec: SiteSpec, asPage = false): string {
  const c = spec.content;
  if (!c.services.length) return '';
  const serviceImgs = imgsByRole(spec, 'service');
  const items = c.services
    .map((s, i) => {
      const num = String(i + 1).padStart(2, '0');
      const img = serviceImgs[i];
      const media =
        img && asPage
          ? `<div class="sf-service-media"><img src="${attr(img.src)}" alt="${attr(img.alt || s.name)}" loading="lazy" width="800" height="450" /></div>`
          : '';
      return `<li class="sf-numbered-item">
  <span class="sf-item-num">${esc(num)}</span>
  <div class="sf-item-body"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p>${media}</div>
</li>`;
    })
    .join('');
  if (asPage) {
    return `<section class="sf-numbered-services" id="services">
  <ol class="sf-numbered-list">${items}</ol>
</section>`;
  }
  return `<section class="sf-section sf-numbered-services">
  <div class="sf-section-head">
    <span class="sf-eyebrow">Services</span>
    <h2>${esc(c.servicesTitle)}</h2>
  </div>
  <ol class="sf-numbered-list">${items}</ol>
</section>`;
}

export const cleanClinicRenderer: LayoutRenderer = {
  homeContent(spec, _theme) {
    const parts: string[] = [statSplitHero(spec)];
    const order = spec.composition?.homeTeasers ?? ['services', 'about', 'faq', 'testimonials'];
    for (const t of order) {
      if (t === 'services') parts.push(numberedServices(spec));
      else if (t === 'testimonials') parts.push(sharedTestimonials(spec));
      else if (t === 'faq') parts.push(sharedFaq(spec));
    }
    parts.push(sharedHomeCta(spec));
    return parts.filter(Boolean).join('\n');
  },

  servicesContent(spec, _theme) {
    const c = spec.content;
    const banner = imgByRole(spec, 'service', 0) || imgByRole(spec, 'hero', 0);
    return `${sharedPageHero(spec, {
      eyebrow: 'Services',
      title: c.servicesTitle,
      lead: 'Evidence-based care, tailored to you.',
      image: banner,
    })}
${numberedServices(spec, true)}`;
  },
};
