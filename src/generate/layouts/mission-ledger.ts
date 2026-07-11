import { esc, attr, safeHref } from '../html';
import type { SiteSpec } from '../spec';
import type { Theme } from '../themes/types';
import { imgByRole, imgsByRole, hrefFor } from '../spec';
import type { LayoutRenderer } from './types';
import { sharedTestimonials, sharedHomeCta, sharedPageHero, sharedFaq } from './shared';

function impactStatHero(spec: SiteSpec): string {
  const c = spec.content;
  const img = imgByRole(spec, 'hero', 0) || imgByRole(spec, 'about', 0);
  const media = img
    ? `<div class="sf-hero-media"><img src="${attr(img.src)}" alt="${attr(img.alt || spec.business.name)}" loading="eager" width="800" height="1000" /></div>`
    : '';
  const impactHighlight = (c.highlights ?? [])[0];
  const impactParts = impactHighlight?.match(/^([^—–\s]+(?:\s+[^—–\s]+)?)\s*[—–]\s*(.*)/);
  const impactNum = impactParts?.[1] ?? '';
  const impactContext = impactParts?.[2] ?? impactHighlight ?? '';
  const impactBlock = impactNum
    ? `<div class="sf-impact-headline"><span class="sf-impact-num">${esc(impactNum)}</span><span class="sf-impact-context">${esc(impactContext)}</span></div>`
    : '';
  return `<section class="sf-hero sf-hero--impact-stat" id="home">
  <div class="sf-hero-body">
    ${spec.business.tagline ? `<p class="sf-eyebrow">${esc(spec.business.tagline)}</p>` : ''}
    ${impactBlock}
    <h1 class="sf-hero-title">${esc(c.heroHeadline)}</h1>
    <p class="sf-hero-sub">${esc(c.heroSub)}</p>
    <div class="sf-hero-cta">
      <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref))}">${esc(c.heroCtaLabel)}</a>
      <a class="sf-btn sf-btn--ghost" href="${attr(hrefFor(spec.sections, 'about'))}">Our mission</a>
    </div>
  </div>
  ${media}
</section>`;
}

function storySection(spec: SiteSpec): string {
  const c = spec.content;
  if (!c.aboutBody.length) return '';
  const pull = c.aboutBody[1] || c.aboutBody[0] || '';
  const body = c.aboutBody
    .slice(0, 2)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('');
  const impactCards = (c.highlights ?? [])
    .slice(1, 5)
    .map((h) => {
      const m = h.match(/^([^—–\s]+(?:\s+[^—–\s]+)?)\s*[—–]\s*(.*)/);
      if (m) {
        return `<div class="sf-impact-card"><span class="sf-impact-card-num">${esc(m[1]!)}</span><span class="sf-impact-card-label">${esc(m[2]!)}</span></div>`;
      }
      return `<div class="sf-impact-card" style="text-align:left;padding:1.25rem"><p style="margin:0;font-size:.95rem;color:var(--muted)">${esc(h)}</p></div>`;
    })
    .join('');
  return `<section class="sf-section sf-story-section">
  <div class="sf-story-body">
    <span class="sf-eyebrow">Our Story</span>
    <h2>${esc(c.aboutTitle)}</h2>
    ${body}
    ${impactCards ? `<div class="sf-impact-grid">${impactCards}</div>` : ''}
  </div>
  <div>
    <blockquote class="sf-story-pull">${esc(pull)}</blockquote>
  </div>
</section>`;
}

function programRows(spec: SiteSpec): string {
  const c = spec.content;
  if (!c.services.length) return '';
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
  return `<section class="sf-section sf-services sf-services--grid">
  <div class="sf-section-head">
    <span class="sf-eyebrow">Programs</span>
    <h2>${esc(c.servicesTitle)}</h2>
  </div>
  <div class="sf-service-grid">${items}</div>
</section>`;
}

export const missionLedgerRenderer: LayoutRenderer = {
  homeContent(spec, _theme) {
    const parts: string[] = [impactStatHero(spec)];
    const order = spec.composition?.homeTeasers ?? ['about', 'services', 'gallery', 'testimonials'];
    for (const t of order) {
      if (t === 'about') parts.push(storySection(spec));
      else if (t === 'services') parts.push(programRows(spec));
      else if (t === 'testimonials') parts.push(sharedTestimonials(spec));
      else if (t === 'faq') parts.push(sharedFaq(spec));
    }
    parts.push(sharedHomeCta(spec));
    return parts.filter(Boolean).join('\n');
  },

  servicesContent(spec, _theme) {
    const c = spec.content;
    const banner = imgByRole(spec, 'hero', 0);
    return `${sharedPageHero(spec, {
      eyebrow: 'Programs',
      title: c.servicesTitle,
      lead: 'Initiatives built to create lasting change.',
      image: banner,
    })}
${programRows(spec)}`;
  },
};
