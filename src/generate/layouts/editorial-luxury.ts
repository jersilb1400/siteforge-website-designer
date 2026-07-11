import { esc, attr, safeHref } from '../html';
import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';
import { imgByRole, hrefFor } from '../spec';
import type { LayoutRenderer } from './types';
import { sharedTestimonials, sharedHomeCta, sharedPageHero, sharedFaq } from './shared';

/** Hyper-minimal / Barely There — brand + one line + CTA on a full-bleed photo. */
function barelyHero(spec: SiteSpec): string {
  const c = spec.content;
  const img = imgByRole(spec, 'hero', 0);
  const media = img
    ? `<div class="sf-hero-media-fill" aria-hidden="true"><img src="${attr(img.src)}" alt="" loading="eager" width="1600" height="1000" /></div>`
    : '';
  const brand = esc(spec.business.name);
  const line = esc(c.heroSub || spec.business.tagline || '');
  return `<section class="sf-hero sf-hero--barely" id="home">
  ${media}
  <div class="sf-barely-scrim" aria-hidden="true"></div>
  <div class="sf-barely-body sf-reveal">
    <p class="sf-barely-brand">${brand}</p>
    <h1 class="sf-barely-line">${line || esc(c.heroHeadline)}</h1>
    <div class="sf-hero-cta">
      <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
    </div>
  </div>
</section>`;
}

/** Sparse service rows — typography as UI, no cards. */
function barelyServices(spec: SiteSpec, asPage = false): string {
  const c = spec.content;
  if (!c.services.length) return '';
  const rows = c.services
    .map(
      (s, i) => `<a class="sf-barely-row sf-reveal" style="--sf-delay:${i * 70}ms" href="${attr(asPage ? safeHref(c.heroCtaHref) : hrefFor(spec.sections, 'services'))}">
  <span class="sf-barely-row-name">${esc(s.name)}</span>
  <span class="sf-barely-row-desc">${esc(s.desc)}</span>
</a>`,
    )
    .join('');
  if (asPage) {
    return `<section class="sf-section sf-barely-services" id="services">
  <div class="sf-barely-rows">${rows}</div>
</section>`;
  }
  return `<section class="sf-section sf-barely-services">
  <div class="sf-section-head sf-reveal">
    <span class="sf-eyebrow">${esc(c.servicesTitle)}</span>
    <h2>Selected rituals</h2>
  </div>
  <div class="sf-barely-rows">${rows}</div>
</section>`;
}

function barelyAbout(spec: SiteSpec): string {
  const c = spec.content;
  if (!spec.sections.some((s) => s.id === 'about')) return '';
  const blurb = c.aboutBody[0] || c.heroSub;
  const img = imgByRole(spec, 'about', 0);
  const media = img
    ? `<div class="sf-barely-about-media"><img src="${attr(img.src)}" alt="${attr(img.alt || spec.business.name)}" loading="lazy" width="900" height="1100" /></div>`
    : '';
  return `<section class="sf-section sf-barely-about">
  ${media}
  <div class="sf-barely-about-copy sf-reveal">
    <span class="sf-eyebrow">About</span>
    <h2>${esc(c.aboutTitle)}</h2>
    <p>${esc(blurb)}</p>
    <a class="sf-btn sf-btn--ghost" href="${attr(hrefFor(spec.sections, 'about'))}">Our story</a>
  </div>
</section>`;
}

export const editorialLuxuryRenderer: LayoutRenderer = {
  homeContent(spec, _theme) {
    const parts: string[] = [barelyHero(spec)];
    const order = spec.composition?.homeTeasers ?? ['services', 'testimonials', 'about'];
    for (const t of order) {
      if (t === 'services') parts.push(barelyServices(spec));
      else if (t === 'about') parts.push(barelyAbout(spec));
      else if (t === 'testimonials') parts.push(sharedTestimonials(spec));
      else if (t === 'faq') parts.push(sharedFaq(spec));
    }
    parts.push(sharedHomeCta(spec));
    return parts.filter(Boolean).join('\n');
  },

  servicesContent(spec, _theme: Theme) {
    const c = spec.content;
    const banner = imgByRole(spec, 'atmosphere', 0) || imgByRole(spec, 'hero', 0);
    return `${sharedPageHero(spec, {
      eyebrow: 'Offerings',
      title: c.servicesTitle,
      lead: 'Quiet rooms. Unhurried care.',
      image: banner,
    })}
${barelyServices(spec, true)}`;
  },
};
