import { esc, attr, safeHref } from '../html';
import type { SiteSpec, SiteImage } from '../spec';
import { imgByRole, contactHref } from '../spec';

export function sharedPageHero(
  spec: SiteSpec,
  opts: { eyebrow?: string; title: string; lead: string; image?: SiteImage | undefined },
): string {
  const img = opts.image;
  const media = img
    ? `<div class="sf-page-hero-media" aria-hidden="true"><img src="${attr(img.src)}" alt="" loading="eager" width="1600" height="700" /></div>`
    : '';
  return `<section class="sf-page-hero${img ? ' sf-page-hero--has-photo' : ''}">
  ${media}
  <div class="sf-page-hero-body">
    ${opts.eyebrow ? `<p class="sf-eyebrow">${esc(opts.eyebrow)}</p>` : ''}
    <h1 class="sf-page-hero-title">${esc(opts.title)}</h1>
    <p class="sf-page-hero-lead">${esc(opts.lead)}</p>
  </div>
</section>`;
}

export function sharedTestimonials(spec: SiteSpec): string {
  const items = spec.content.testimonials ?? [];
  if (!items.length) return '';
  const cards = items
    .slice(0, 3)
    .map(
      (t) =>
        `<blockquote class="sf-quote"><p>${esc(t.quote)}</p><footer>${esc(t.attribution)}</footer></blockquote>`,
    )
    .join('');
  return `<section class="sf-section sf-testimonials">
  <div class="sf-section-head">
    <span class="sf-eyebrow">Voices</span>
    <h2>What people say</h2>
  </div>
  <div class="sf-quote-grid">${cards}</div>
</section>`;
}

export function sharedFaq(spec: SiteSpec): string {
  const items = spec.content.faq ?? [];
  if (!items.length) return '';
  const rows = items
    .slice(0, 6)
    .map(
      (f) =>
        `<details class="sf-faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`,
    )
    .join('');
  return `<section class="sf-section sf-faq">
  <div class="sf-section-head"><span class="sf-eyebrow">FAQ</span><h2>Common questions</h2></div>
  <div class="sf-faq-list">${rows}</div>
</section>`;
}

export function sharedHomeCta(spec: SiteSpec): string {
  const c = spec.content;
  const contact = contactHref(spec.sections);
  return `<section class="sf-section sf-home-cta">
  <div class="sf-home-cta-inner">
    <h2>${esc(c.ctaTitle)}</h2>
    <p>${esc(c.ctaBody)}</p>
    <a class="sf-btn sf-btn--primary" href="${attr(safeHref(c.heroCtaHref || contact))}">${esc(c.heroCtaLabel)}</a>
  </div>
</section>`;
}
