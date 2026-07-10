import type { Env } from '../types';

// Model routing. Interview follow-ups and content generation want a capable
// model (SMART); cheap classification/tagging can use CHEAP. Defaults live in
// wrangler.toml [vars] and are overridable per-environment. See the Anthropic
// model IDs in docs — do not hardcode marketing names elsewhere.
export function models(env: Env) {
  return {
    smart: env.ANTHROPIC_MODEL_SMART || 'claude-sonnet-5',
    cheap: env.ANTHROPIC_MODEL_CHEAP || 'claude-haiku-4-5-20251001',
  };
}

/** OpenRouter image model — cheapest high-quality FLUX.2 tier by default. */
export function imageModel(env: Env): string {
  return env.OPENROUTER_IMAGE_MODEL || 'black-forest-labs/flux.2-klein-4b';
}

export function isProduction(env: Env): boolean {
  return env.ENVIRONMENT === 'production';
}
