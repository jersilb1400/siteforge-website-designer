import type { Env } from '../types';
import { anthropicFrom } from '../lib/anthropic';
import { models } from '../lib/config';
import type { Theme } from './themes/types';
import { selectRecipe, resolveComposition, type CompositionResolved, type RecipeId } from './composition';

// The "design director" (frontend-design methodology, guardrailed). Instead of
// letting a model emit arbitrary CSS (which breaks layouts + Lighthouse), it
// chooses from CURATED, vetted pools — a font pairing, a signature treatment,
// a composition recipe, and a validated brand/accent palette.

export interface FontPairing {
  display: string;
  body: string;
  href: string;
}

// Vetted Google Font pairings — no Inter as body (frontend-design / ADR-0013).
export const FONT_PAIRINGS: Record<string, FontPairing> = {
  editorial: {
    display: `'Fraunces', Georgia, serif`,
    body: `'Source Sans 3', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Source+Sans+3:wght@400;500;600&display=swap',
  },
  grotesque: {
    display: `'Syne', system-ui, sans-serif`,
    body: `'Figtree', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Figtree:wght@400;500;600&display=swap',
  },
  humanist: {
    display: `'Newsreader', Georgia, serif`,
    body: `'Source Sans 3', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Source+Sans+3:wght@400;500;600&display=swap',
  },
  geometric: {
    display: `'Outfit', system-ui, sans-serif`,
    body: `'Figtree', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Figtree:wght@400;500;600&display=swap',
  },
  'high-contrast': {
    display: `'Playfair Display', Georgia, serif`,
    body: `'Source Sans 3', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;500;600&display=swap',
  },
  slab: {
    display: `'Zilla Slab', Georgia, serif`,
    body: `'Figtree', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@500;600;700&family=Figtree:wght@400;500;600&display=swap',
  },
  elegant: {
    display: `'Cormorant Garamond', Georgia, serif`,
    body: `'Figtree', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Figtree:wght@400;500;600&display=swap',
  },
  craft: {
    display: `'Libre Baskerville', Georgia, serif`,
    body: `'Karla', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Karla:wght@400;500;600&display=swap',
  },
};

export const SIGNATURES: Record<string, string> = {
  none: '',
  'accent-rule': `.sf-section-head{position:relative;padding-top:1.1rem}.sf-section-head::before{content:'';position:absolute;top:0;left:0;width:56px;height:3px;background:var(--accent)}`,
  'gradient-hero': `.sf-hero{background:linear-gradient(160deg,color-mix(in srgb,var(--brand) 10%,var(--bg)),var(--bg) 70%)}`,
  'underline-heads': `.sf-section-head h2{background-image:linear-gradient(var(--accent),var(--accent));background-size:100% 3px;background-position:0 100%;background-repeat:no-repeat;padding-bottom:6px}`,
  'framed-cards': `.sf-service{border:1.5px solid var(--ink);box-shadow:4px 4px 0 var(--accent)}`,
  'wide-eyebrow': `.sf-eyebrow{font-size:.9rem;letter-spacing:.24em}`,
  'ticker-nav': `.sf-header{border-bottom:2px solid var(--ink)}.sf-brand{text-transform:uppercase;letter-spacing:.02em}`,
  'soft-rise': `.sf-hero-body{animation:sf-rise .9s cubic-bezier(.22,1,.36,1) both}@keyframes sf-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}`,
};

export interface DesignResolved {
  fontDisplay: string;
  fontBody: string;
  fontHref: string;
  signatureCss: string;
  brand?: string;
  accent?: string;
  rationale?: string;
  recipeId?: RecipeId;
  composition?: CompositionResolved;
}

const HEX = /^#[0-9a-f]{6}$/i;

export function resolveDesign(pick: {
  fontPairing?: string;
  signature?: string;
  brand?: string;
  accent?: string;
  rationale?: string;
  recipeId?: string;
  industry?: string;
  tone?: string;
  themeId?: string;
}): DesignResolved | null {
  const pairing = pick.fontPairing && FONT_PAIRINGS[pick.fontPairing];
  const signature = pick.signature && pick.signature in SIGNATURES ? SIGNATURES[pick.signature] : undefined;
  if (!pairing) return null;
  const recipe = selectRecipe({
    industry: pick.industry,
    tone: pick.tone,
    themeId: pick.themeId,
    recipeOverride: pick.recipeId,
  });
  return {
    fontDisplay: pairing.display,
    fontBody: pairing.body,
    fontHref: pairing.href,
    signatureCss: signature ?? '',
    brand: pick.brand && HEX.test(pick.brand) ? pick.brand.toLowerCase() : undefined,
    accent: pick.accent && HEX.test(pick.accent) ? pick.accent.toLowerCase() : undefined,
    rationale: typeof pick.rationale === 'string' ? pick.rationale.slice(0, 200) : undefined,
    recipeId: recipe.id,
    composition: resolveComposition(recipe),
  };
}

export interface Brief {
  name: string;
  industry: string;
  tone: string;
  story: string;
  demo?: boolean;
}

/**
 * Ask Claude to art-direct within the guardrails. Returns null when no API key
 * is set or the pick fails validation — callers then use deterministic defaults.
 */
export async function deriveDesign(env: Env, brief: Brief, baseTheme: Theme): Promise<DesignResolved | null> {
  const fallbackRecipe = selectRecipe({
    industry: brief.industry,
    tone: brief.tone,
    themeId: baseTheme.id,
  });

  if (!env.ANTHROPIC_API_KEY) {
    // Still attach composition even without Claude.
    const pairing = FONT_PAIRINGS.elegant!;
    return {
      fontDisplay: pairing.display,
      fontBody: pairing.body,
      fontHref: pairing.href,
      signatureCss: SIGNATURES['soft-rise'] || '',
      recipeId: fallbackRecipe.id,
      composition: resolveComposition(fallbackRecipe),
    };
  }
  try {
    const client = anthropicFrom(env.ANTHROPIC_API_KEY);
    const { smart } = models(env);
    const pick = await client.completeJSON<{
      fontPairing: string;
      signature: string;
      brand: string;
      accent: string;
      rationale: string;
      recipeId: string;
    }>({
      model: smart,
      maxTokens: 450,
      temperature: 0.8,
      system:
        'You are an art director giving a small business a distinctive but professional visual identity. ' +
        'Make deliberate, specific choices for THIS brief — avoid generic defaults. Return only the requested JSON.',
      messages: [
        {
          role: 'user',
          content:
            `Business: ${brief.name}\nIndustry: ${brief.industry}\nTone: ${brief.tone}\n` +
            `Story: ${brief.story.slice(0, 500)}\nBase layout theme: ${baseTheme.name} (${baseTheme.id})\n` +
            `Demo: ${brief.demo ? 'yes' : 'no'}\n\n` +
            `Choose a visual identity as JSON:\n` +
            `- fontPairing: one of [${Object.keys(FONT_PAIRINGS).join(', ')}]\n` +
            `- signature: one of [${Object.keys(SIGNATURES).join(', ')}]\n` +
            `- recipeId: one of [editorial-luxury, warm-hospitality, reverent-sanctuary, clean-clinic, craft-trade, mission-ledger] (match industry)\n` +
            `- brand: a #hex brand color that suits this business\n` +
            `- accent: a complementary #hex accent\n` +
            `- rationale: one sentence on why these fit the brief\n` +
            `Return {"fontPairing":"...","signature":"...","recipeId":"...","brand":"#...","accent":"#...","rationale":"..."}.`,
        },
      ],
    });
    return resolveDesign({
      ...pick,
      industry: brief.industry,
      tone: brief.tone,
      themeId: baseTheme.id,
    });
  } catch {
    const pairing = FONT_PAIRINGS.elegant!;
    return {
      fontDisplay: pairing.display,
      fontBody: pairing.body,
      fontHref: pairing.href,
      signatureCss: SIGNATURES['accent-rule'] || '',
      recipeId: fallbackRecipe.id,
      composition: resolveComposition(fallbackRecipe),
    };
  }
}
