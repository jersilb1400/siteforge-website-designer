import type { SiteSpec } from './spec';
import { luminance } from './palette';

// In-worker quality gate: fast structural/accessibility/SEO checks on the
// generated HTML, a deployable proxy for the Lighthouse 90+/WCAG AA bar. A real
// Lighthouse run (Chrome-driven) lives in scripts/lighthouse-gate.mjs for CI;
// this catches regressions at build time and gates publishing.

export interface QualityCheck {
  id: string;
  ok: boolean;
  weight: number;
  note: string;
}

export interface QualityResult {
  score: number; // 0-100
  pass: boolean; // score >= 90 and no critical failure
  checks: QualityCheck[];
  /** Per-file pass flags for multi-page bundles (home drives the headline score). */
  pages?: Record<string, { score: number; pass: boolean }>;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function qualityCheck(html: string, spec: SiteSpec): QualityResult {
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const imgsMissingAlt = imgs.filter((t) => !/\balt\s*=\s*"[^"]*"/i.test(t)).length;
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;

  const checks: QualityCheck[] = [
    { id: 'lang', weight: 10, ok: /<html[^>]*\slang=/i.test(html), note: 'html has lang attribute' },
    { id: 'viewport', weight: 10, ok: /name="viewport"/i.test(html), note: 'responsive viewport meta' },
    { id: 'title', weight: 10, ok: /<title>[^<]{2,}<\/title>/i.test(html), note: 'non-empty <title>' },
    { id: 'meta-description', weight: 10, ok: /name="description"\s+content="[^"]{10,}"/i.test(html), note: 'meta description present' },
    { id: 'single-h1', weight: 15, ok: h1Count === 1, note: `exactly one <h1> (found ${h1Count})` },
    { id: 'img-alt', weight: 15, ok: imgsMissingAlt === 0, note: `all images have alt (${imgsMissingAlt} missing)` },
    { id: 'json-ld', weight: 10, ok: /application\/ld\+json/i.test(html), note: 'structured data (JSON-LD)' },
    { id: 'skip-link', weight: 5, ok: /class="sf-skip"/i.test(html), note: 'skip-to-content link' },
    { id: 'og-tags', weight: 5, ok: /property="og:title"/i.test(html), note: 'OpenGraph tags' },
    {
      id: 'contrast-link',
      weight: 5,
      ok: contrast(spec.palette.link, spec.palette.bg) >= 4.5,
      note: 'link color meets WCAG AA on background',
    },
    {
      id: 'contrast-accent',
      weight: 5,
      ok: contrast(spec.palette.accent, spec.palette.bg) >= 4.5,
      note: 'accent color meets WCAG AA on background',
    },
    // Non-blocking design checks (weight 0) — visible in lighthouse_json, do not fail publish.
    {
      id: 'design-cta',
      weight: 0,
      ok: !/^(learn more|click here|read more)$/i.test(spec.content.heroCtaLabel.trim()),
      note: 'primary CTA is not a weak generic label',
    },
    {
      id: 'design-font',
      weight: 0,
      ok: !/Inter/i.test(spec.design?.fontBody || ''),
      note: 'body font is not Inter',
    },
    {
      id: 'design-composition',
      weight: 0,
      ok: !!spec.composition?.recipeId,
      note: 'composition recipe attached',
    },
    {
      id: 'design-hero-photo',
      weight: 0,
      ok:
        !(spec.composition?.hero === 'full-bleed' || spec.composition?.brandFirst) ||
        /sf-hero--has-photo|sf-hero-media--bleed/.test(html) ||
        spec.images.some((im) => im.role === 'hero'),
      note: 'premium recipe has a hero photo',
    },
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.ok ? c.weight : 0), 0);
  const score = Math.round((earned / total) * 100);

  // Critical checks that must pass regardless of score.
  const critical = ['single-h1', 'img-alt', 'lang', 'contrast-link'];
  const criticalOk = checks.filter((c) => critical.includes(c.id)).every((c) => c.ok);

  return { score, pass: score >= 90 && criticalOk, checks };
}

/** Run qualityCheck on every HTML file; home drives the published score, all must pass criticals. */
export function qualityCheckBundle(files: Record<string, string>, spec: SiteSpec): QualityResult {
  const htmlFiles = Object.entries(files).filter(([path]) => path.endsWith('.html'));
  if (!htmlFiles.length) return qualityCheck('', spec);

  const pages: Record<string, { score: number; pass: boolean }> = {};
  let allPass = true;
  for (const [path, html] of htmlFiles) {
    const r = qualityCheck(html, spec);
    pages[path] = { score: r.score, pass: r.pass };
    if (!r.pass) allPass = false;
  }

  const home = qualityCheck(files['index.html'] ?? htmlFiles[0]![1], spec);
  return {
    ...home,
    pass: home.pass && allPass,
    pages,
    checks: [
      ...home.checks,
      {
        id: 'multi-page',
        weight: 0,
        ok: allPass,
        note: allPass
          ? `all ${htmlFiles.length} pages pass quality`
          : `some pages failed: ${Object.entries(pages)
              .filter(([, p]) => !p.pass)
              .map(([k]) => k)
              .join(', ')}`,
      },
    ],
  };
}
