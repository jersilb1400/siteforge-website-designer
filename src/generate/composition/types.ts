import type { ImageRole } from '../images/prompts';

// Guardrailed composition recipes: curated layout shapes Claude can pick from.
// Renderers read these; themes only style the resulting sf-* classes.

export type RecipeId =
  | 'editorial-luxury'
  | 'warm-hospitality'
  | 'reverent-sanctuary'
  | 'clean-clinic'
  | 'craft-trade'
  | 'mission-ledger';

export type HeroMode = 'full-bleed' | 'split' | 'centered';
export type HomeTeaser = 'services' | 'about' | 'gallery' | 'testimonials' | 'faq';
export type SecondaryCta = 'about' | 'services' | 'none';

export interface ImageSlot {
  role: ImageRole;
  aspectRatio: '16:9' | '4:3' | '3:2' | '1:1';
}

export interface CompositionRecipe {
  id: RecipeId;
  name: string;
  suits: { industries?: string[]; tones?: string[]; themes?: string[] };
  /** Force hero composition regardless of theme.layout.hero. */
  hero: HeroMode;
  brandFirst: boolean;
  /** Order of home teaser bands. */
  homeTeasers: HomeTeaser[];
  /** Extra nav pages beyond the interview map (team, faq, give, visit). */
  extraPages: Array<{ id: string; label: string }>;
  imageSlots: ImageSlot[];
  stickyCta: boolean;
  secondaryCta: SecondaryCta;
  /** Prefer inventing testimonials/FAQ on demos; clients only when sourced. */
  allowInventedSocial: boolean;
}

export interface CompositionResolved {
  recipeId: RecipeId;
  hero: HeroMode;
  brandFirst: boolean;
  homeTeasers: HomeTeaser[];
  stickyCta: boolean;
  secondaryCta: SecondaryCta;
  allowInventedSocial: boolean;
}
