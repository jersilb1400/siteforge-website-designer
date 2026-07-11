import { esc, attr, safeHref } from '../html';
import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';
import { imgByRole, hrefFor } from '../spec';
import type { LayoutRenderer } from './types';
import { sharedTestimonials, sharedHomeCta, sharedPageHero } from './shared';

const MINISTRY_ICONS: Record<number, string> = {
  0: '✝',
  1: '♪',
  2: '◎',
  3: '⊕',
  4: '✦',
  5: '◈',
};

function sanctuaryHero(spec: SiteSpec): string {
  const c = spec.content;
  const img = imgByRole(spec, 'hero', 0);
  const media = img
    ? `<div class="sf-hero-media-fill" aria-hidden="true"><img src="${attr(img.src)}" alt="" loading="eager" width="1600" height="1000" /></div>`
    : '';
  return `<section class="sf-hero sf-hero--sanctuary-immersive" id="home">
  ${media}
  <div class="sf-sanctuary-motif" aria-hidden="true"></div>
  <div class="sf-hero-body">
    ${spec.business.tagline ? `<p class="sf-eyebrow">${esc(spec.business.tagline)}</p>` : ''}
    <h1 class="sf-hero-title">${esc(c.heroHeadline)}</h1>
    <p class="sf-hero-sub">${esc(c.heroSub)}</p>
    <div class="sf-hero-cta">
      <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
      <a class="sf-btn sf-btn--ghost" href="${attr(hrefFor(spec.sections, 'about'))}">Our story</a>
    </div>
  </div>
</section>`;
}

function ministryRows(spec: SiteSpec, asPage = false): string {
  const c = spec.content;
  if (!c.services.length) return '';
  const rows = c.services
    .slice(0, 5)
    .map(
      (s, i) => `<div class="sf-ministry-item">
  <div class="sf-ministry-icon" aria-hidden="true">${MINISTRY_ICONS[i] ?? '✝'}</div>
  <div class="sf-ministry-body"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p></div>
</div>`,
    )
    .join('');
  if (asPage) {
    return `<section class="sf-section sf-ministry-rows" id="services">
  <div class="sf-ministry-list">${rows}</div>
</section>`;
  }
  return `<section class="sf-section sf-ministry-rows">
  <div class="sf-section-head">
    <span class="sf-eyebrow">Ministries &amp; Programs</span>
    <h2>${esc(c.servicesTitle)}</h2>
  </div>
  <div class="sf-ministry-list">${rows}</div>
</section>`;
}

export const reverentSanctuaryRenderer: LayoutRenderer = {
  homeContent(spec, _theme) {
    const parts: string[] = [sanctuaryHero(spec)];
    const order = spec.composition?.homeTeasers ?? ['about', 'services', 'testimonials'];
    for (const t of order) {
      if (t === 'services') parts.push(ministryRows(spec));
      else if (t === 'testimonials') parts.push(sharedTestimonials(spec));
    }
    parts.push(sharedHomeCta(spec));
    return parts.filter(Boolean).join('\n');
  },

  servicesContent(spec, _theme) {
    const c = spec.content;
    const banner = imgByRole(spec, 'hero', 0);
    return `${sharedPageHero(spec, {
      eyebrow: 'Ministries',
      title: c.servicesTitle,
      lead: 'Every program rooted in community and faith.',
      image: banner,
    })}
${ministryRows(spec, true)}`;
  },
};
