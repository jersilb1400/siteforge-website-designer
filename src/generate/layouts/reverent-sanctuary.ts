import { esc, attr, safeHref } from '../html';
import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';
import { imgByRole, hrefFor } from '../spec';
import type { LayoutRenderer } from './types';
import { sharedTestimonials, sharedHomeCta, sharedPageHero } from './shared';

/** Split a headline into kinetic lines for staggered reveal. */
function kineticLines(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    return words
      .map((w, i) => `<span class="sf-kinetic-line" style="--sf-delay:${i * 120}ms">${esc(w)}</span>`)
      .join('');
  }
  const mid = Math.ceil(words.length / 2);
  const lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  return lines
    .map((line, i) => `<span class="sf-kinetic-line" style="--sf-delay:${i * 140}ms">${esc(line)}</span>`)
    .join('');
}

/** Kinetic Typography — oversized staggered display on a quiet photo plane. */
function kineticHero(spec: SiteSpec): string {
  const c = spec.content;
  const img = imgByRole(spec, 'hero', 0);
  const media = img
    ? `<div class="sf-hero-media-fill" aria-hidden="true"><img src="${attr(img.src)}" alt="" loading="eager" width="1600" height="1000" /></div>`
    : '';
  const brand = esc(spec.business.name);
  return `<section class="sf-hero sf-hero--kinetic" id="home">
  ${media}
  <div class="sf-kinetic-veil" aria-hidden="true"></div>
  <div class="sf-kinetic-body">
    <p class="sf-kinetic-brand sf-reveal">${brand}</p>
    <h1 class="sf-kinetic-title">${kineticLines(c.heroHeadline)}</h1>
    <p class="sf-kinetic-sub sf-reveal" style="--sf-delay:280ms">${esc(c.heroSub)}</p>
    <div class="sf-hero-cta sf-reveal" style="--sf-delay:360ms">
      <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
      <a class="sf-btn sf-btn--ghost" href="${attr(hrefFor(spec.sections, 'about'))}">Our story</a>
    </div>
  </div>
</section>`;
}

/** Ministries as large typographic blocks. */
function typeMinistries(spec: SiteSpec, asPage = false): string {
  const c = spec.content;
  if (!c.services.length) return '';
  const rows = c.services
    .slice(0, 5)
    .map(
      (s, i) => `<article class="sf-type-block sf-reveal" style="--sf-delay:${i * 80}ms">
  <span class="sf-type-index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
  <div class="sf-type-copy">
    <h3>${esc(s.name)}</h3>
    <p>${esc(s.desc)}</p>
  </div>
</article>`,
    )
    .join('');
  if (asPage) {
    return `<section class="sf-section sf-type-ministries" id="services">
  <div class="sf-type-list">${rows}</div>
</section>`;
  }
  return `<section class="sf-section sf-type-ministries">
  <div class="sf-section-head sf-reveal">
    <span class="sf-eyebrow">Ministries</span>
    <h2>${esc(c.servicesTitle)}</h2>
  </div>
  <div class="sf-type-list">${rows}</div>
</section>`;
}

export const reverentSanctuaryRenderer: LayoutRenderer = {
  homeContent(spec, _theme) {
    const parts: string[] = [kineticHero(spec)];
    const order = spec.composition?.homeTeasers ?? ['about', 'services', 'testimonials'];
    for (const t of order) {
      if (t === 'services') parts.push(typeMinistries(spec));
      else if (t === 'testimonials') parts.push(sharedTestimonials(spec));
    }
    parts.push(sharedHomeCta(spec));
    return parts.filter(Boolean).join('\n');
  },

  servicesContent(spec, _theme: Theme) {
    const c = spec.content;
    const banner = imgByRole(spec, 'hero', 0);
    return `${sharedPageHero(spec, {
      eyebrow: 'Ministries',
      title: c.servicesTitle,
      lead: 'Every program rooted in community and faith.',
      image: banner,
    })}
${typeMinistries(spec, true)}`;
  },
};
