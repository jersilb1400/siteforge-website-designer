import type { Env } from '../types';
import { anthropicFrom } from '../lib/anthropic';
import { models } from '../lib/config';
import type { SiteSpec } from './spec';
import { FONT_PAIRINGS, SIGNATURES } from './design-director';
import { selectRecipe, resolveComposition } from './composition';

// Post-generate design critique: score against frontend-design rules and apply
// at most one guarded fix pass (fonts / signature / composition / weak CTA).

export interface CritiqueResult {
  score: number; // 0-100
  pass: boolean;
  notes: string[];
  fixesApplied: string[];
}

const WEAK_CTA = /learn more|click here|read more|get started/i;
const INTER_BODY = /Inter/i;

function localCritique(spec: SiteSpec, homeHtml: string): CritiqueResult {
  const notes: string[] = [];
  let score = 100;

  const hasHeroPhoto =
    /sf-hero--has-photo/.test(homeHtml) || /sf-hero-media--bleed/.test(homeHtml);
  const premium =
    spec.composition?.hero === 'full-bleed' ||
    spec.composition?.hero === 'centered' ||
    spec.composition?.brandFirst;
  if (premium && !hasHeroPhoto) {
    score -= 25;
    notes.push('Premium recipe missing full-bleed hero photo');
  }

  if (WEAK_CTA.test(spec.content.heroCtaLabel)) {
    score -= 20;
    notes.push('Weak primary CTA label');
  }
  if (/Learn more/i.test(homeHtml) && /sf-btn--ghost[^>]*>Learn more</i.test(homeHtml)) {
    score -= 10;
    notes.push('Secondary CTA is generic Learn more');
  }

  const bodyFont = spec.design?.fontBody || '';
  if (INTER_BODY.test(bodyFont)) {
    score -= 15;
    notes.push('Body font uses Inter');
  }

  if (!spec.composition) {
    score -= 10;
    notes.push('No composition recipe attached');
  }

  if (!spec.images.some((im) => im.role === 'hero') && spec.images.length) {
    score -= 5;
    notes.push('Images lack hero role assignment');
  }

  if (/Welcome to/i.test(spec.content.heroSub)) {
    score -= 8;
    notes.push('Hero sub starts with Welcome to');
  }

  score = Math.max(0, Math.min(100, score));
  return { score, pass: score >= 70, notes, fixesApplied: [] };
}

/** Apply deterministic fixes for common design failures. Returns mutated spec. */
export function applyCritiqueFixes(spec: SiteSpec, critique: CritiqueResult): SiteSpec {
  if (critique.pass) return spec;
  const fixes: string[] = [];
  let next = { ...spec, content: { ...spec.content }, design: spec.design ? { ...spec.design } : undefined };

  if (critique.notes.some((n) => /Weak primary CTA/i.test(n))) {
    const industry = spec.business.industry;
    const label =
      industry === 'Day spa / Salon'
        ? 'Book your ritual'
        : industry === 'Restaurant / Cafe'
          ? 'Reserve a table'
          : industry === 'Home & trade services'
            ? 'Get a free quote'
            : industry === 'Church / Ministry'
              ? 'Plan a visit'
              : 'Get in touch';
    next.content.heroCtaLabel = label;
    fixes.push('cta');
  }

  if (critique.notes.some((n) => /Welcome to/i.test(n))) {
    next.content.heroSub = next.content.heroSub.replace(/^Welcome to\s+/i, '');
    fixes.push('heroSub');
  }

  if (critique.notes.some((n) => /Inter/i.test(n)) || INTER_BODY.test(next.design?.fontBody || '')) {
    const pairing = FONT_PAIRINGS.elegant!;
    next.design = {
      fontDisplay: pairing.display,
      fontBody: pairing.body,
      fontHref: pairing.href,
      signatureCss: next.design?.signatureCss || SIGNATURES['soft-rise'] || '',
      rationale: next.design?.rationale,
    };
    fixes.push('fonts');
  }

  if (critique.notes.some((n) => /composition recipe/i.test(n)) || !next.composition) {
    const recipe = selectRecipe({
      industry: next.business.industry,
      tone: next.business.tone,
      themeId: next.themeId,
    });
    next.composition = resolveComposition(recipe);
    fixes.push('composition');
  }

  if (critique.notes.some((n) => /hero photo/i.test(n)) && next.images.length && !next.images.some((i) => i.role === 'hero')) {
    next.images = next.images.map((im, i) => (i === 0 ? { ...im, role: 'hero' as const } : im));
    fixes.push('heroRole');
  }

  critique.fixesApplied = fixes;
  return next;
}

/**
 * Score the home page; optionally ask Claude for notes (fail-open).
 * Always returns a local score so builds never block on the API.
 */
export async function critiqueBuild(
  env: Env,
  spec: SiteSpec,
  homeHtml: string,
): Promise<CritiqueResult> {
  const local = localCritique(spec, homeHtml);
  if (!env.ANTHROPIC_API_KEY || local.pass) return local;

  try {
    const client = anthropicFrom(env.ANTHROPIC_API_KEY);
    const { cheap } = models(env);
    const out = await client.completeJSON<{ score: number; notes: string[] }>({
      model: cheap,
      maxTokens: 300,
      temperature: 0.2,
      system:
        'You score small-business website home pages against frontend-design rules: brand-first hero, no hero cards, distinctive type (not Inter), one job per section, real imagery, conversion CTA. Return JSON only.',
      messages: [
        {
          role: 'user',
          content:
            `Business: ${spec.business.name} (${spec.business.industry})\n` +
            `Recipe: ${spec.composition?.recipeId || 'none'}\n` +
            `CTA: ${spec.content.heroCtaLabel}\n` +
            `Fonts: ${spec.design?.fontDisplay || '?'} / ${spec.design?.fontBody || '?'}\n` +
            `Local notes: ${local.notes.join('; ') || 'none'}\n` +
            `Home HTML excerpt (truncated):\n${homeHtml.slice(0, 3500)}\n\n` +
            `Return {"score":0-100,"notes":["..."]}.`,
        },
      ],
    });
    const score = typeof out.score === 'number' ? Math.max(0, Math.min(100, Math.round(out.score))) : local.score;
    const notes = Array.isArray(out.notes) ? [...local.notes, ...out.notes.map(String).slice(0, 5)] : local.notes;
    return { score, pass: score >= 70, notes, fixesApplied: [] };
  } catch {
    return local;
  }
}
