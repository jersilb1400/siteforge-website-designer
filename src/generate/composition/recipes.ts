import type { CompositionRecipe, RecipeId, CompositionResolved } from './types';

const SLOTS_PREMIUM = [
  { role: 'hero' as const, aspectRatio: '16:9' as const },
  { role: 'about' as const, aspectRatio: '4:3' as const },
  { role: 'service' as const, aspectRatio: '4:3' as const },
  { role: 'service' as const, aspectRatio: '4:3' as const },
  { role: 'service' as const, aspectRatio: '4:3' as const },
  { role: 'gallery' as const, aspectRatio: '1:1' as const },
  { role: 'gallery' as const, aspectRatio: '1:1' as const },
  { role: 'atmosphere' as const, aspectRatio: '3:2' as const },
];

export const RECIPES: CompositionRecipe[] = [
  {
    id: 'editorial-luxury',
    name: 'Editorial Luxury',
    suits: {
      industries: ['Day spa / Salon'],
      tones: ['Warm', 'Minimal'],
      themes: ['haven'],
    },
    layoutVariant: 'editorial-luxury',
    hero: 'full-bleed',
    brandFirst: true,
    homeTeasers: ['services', 'testimonials', 'about', 'gallery'],
    extraPages: [{ id: 'faq', label: 'FAQ' }],
    imageSlots: SLOTS_PREMIUM,
    stickyCta: true,
    secondaryCta: 'services',
    allowInventedSocial: true,
  },
  {
    id: 'warm-hospitality',
    name: 'Warm Hospitality',
    suits: {
      industries: ['Restaurant / Cafe', 'Retail / shop'],
      tones: ['Warm', 'Bold'],
      themes: ['storefront'],
    },
    layoutVariant: 'warm-hospitality',
    hero: 'full-bleed',
    brandFirst: true,
    homeTeasers: ['services', 'gallery', 'about', 'testimonials'],
    extraPages: [],
    imageSlots: SLOTS_PREMIUM,
    stickyCta: true,
    secondaryCta: 'services',
    allowInventedSocial: true,
  },
  {
    id: 'reverent-sanctuary',
    name: 'Reverent Sanctuary',
    suits: {
      industries: ['Church / Ministry'],
      tones: ['Warm', 'Minimal'],
      themes: ['sanctuary'],
    },
    layoutVariant: 'reverent-sanctuary',
    hero: 'full-bleed',
    brandFirst: true,
    homeTeasers: ['about', 'services', 'testimonials', 'gallery'],
    extraPages: [
      { id: 'visit', label: 'Visit' },
      { id: 'give', label: 'Give' },
    ],
    imageSlots: SLOTS_PREMIUM,
    stickyCta: true,
    secondaryCta: 'about',
    allowInventedSocial: true,
  },
  {
    id: 'clean-clinic',
    name: 'Clean Clinic',
    suits: {
      industries: ['Health & wellness', 'Professional services (law, accounting, consulting)'],
      tones: ['Minimal', 'Bold'],
      themes: ['meridian', 'atelier'],
    },
    layoutVariant: 'clean-clinic',
    hero: 'split',
    brandFirst: false,
    homeTeasers: ['services', 'about', 'faq', 'testimonials'],
    extraPages: [
      { id: 'team', label: 'Team' },
      { id: 'faq', label: 'FAQ' },
    ],
    imageSlots: SLOTS_PREMIUM,
    stickyCta: true,
    secondaryCta: 'about',
    allowInventedSocial: true,
  },
  {
    id: 'craft-trade',
    name: 'Craft Trade',
    suits: {
      industries: ['Home & trade services'],
      tones: ['Bold', 'Warm'],
      themes: ['forge'],
    },
    layoutVariant: 'craft-trade',
    hero: 'full-bleed',
    brandFirst: true,
    homeTeasers: ['services', 'gallery', 'testimonials', 'about'],
    extraPages: [{ id: 'faq', label: 'FAQ' }],
    imageSlots: SLOTS_PREMIUM,
    stickyCta: true,
    secondaryCta: 'services',
    allowInventedSocial: true,
  },
  {
    id: 'mission-ledger',
    name: 'Mission Ledger',
    suits: {
      industries: ['Nonprofit', 'Personal brand / portfolio'],
      tones: ['Warm', 'Minimal'],
      themes: ['ledger', 'gallery'],
    },
    layoutVariant: 'mission-ledger',
    hero: 'centered',
    brandFirst: true,
    homeTeasers: ['about', 'services', 'gallery', 'testimonials'],
    extraPages: [{ id: 'team', label: 'Team' }],
    imageSlots: SLOTS_PREMIUM,
    stickyCta: true,
    secondaryCta: 'about',
    allowInventedSocial: true,
  },
];

export const DEFAULT_RECIPE = RECIPES[0]!;

export function getRecipe(id: string | undefined): CompositionRecipe {
  return RECIPES.find((r) => r.id === id) ?? DEFAULT_RECIPE;
}

export function recipeExists(id: string): boolean {
  return RECIPES.some((r) => r.id === id);
}

/**
 * Deterministic recipe pick: theme match → industry → tone → default.
 */
export function selectRecipe(opts: {
  industry?: string;
  tone?: string;
  themeId?: string;
  recipeOverride?: string;
}): CompositionRecipe {
  if (opts.recipeOverride && recipeExists(opts.recipeOverride)) {
    return getRecipe(opts.recipeOverride);
  }
  if (opts.themeId) {
    const byTheme = RECIPES.find((r) => r.suits.themes?.includes(opts.themeId!));
    if (byTheme) return byTheme;
  }
  if (opts.industry) {
    const byIndustry = RECIPES.find((r) => r.suits.industries?.includes(opts.industry!));
    if (byIndustry) return byIndustry;
  }
  if (opts.tone) {
    const byTone = RECIPES.find((r) => r.suits.tones?.includes(opts.tone!));
    if (byTone) return byTone;
  }
  return DEFAULT_RECIPE;
}

export function resolveComposition(recipe: CompositionRecipe): CompositionResolved {
  return {
    recipeId: recipe.id,
    layoutVariant: recipe.layoutVariant,
    hero: recipe.hero,
    brandFirst: recipe.brandFirst,
    homeTeasers: [...recipe.homeTeasers],
    stickyCta: recipe.stickyCta,
    secondaryCta: recipe.secondaryCta,
    allowInventedSocial: recipe.allowInventedSocial,
  };
}

export function listRecipes(): Array<{ id: RecipeId; name: string }> {
  return RECIPES.map((r) => ({ id: r.id, name: r.name }));
}
