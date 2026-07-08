import type { Theme } from './types';
import { atelier } from './atelier';
import { sanctuary } from './sanctuary';
import { storefront } from './storefront';

export type { Theme } from './types';

export const THEMES: Theme[] = [atelier, sanctuary, storefront];
export const DEFAULT_THEME = atelier;

export function getTheme(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}

export function themeExists(id: string): boolean {
  return THEMES.some((t) => t.id === id);
}

/**
 * Auto-select a theme from industry + tone. Industry match wins (it's the
 * stronger signal); tone breaks ties; falls back to the default.
 */
export function selectTheme(industry?: string, tone?: string): Theme {
  const byIndustry = industry && THEMES.find((t) => t.suits.industries?.includes(industry));
  if (byIndustry) return byIndustry;
  const byTone = tone && THEMES.find((t) => t.suits.tones?.includes(tone));
  if (byTone) return byTone;
  return DEFAULT_THEME;
}

export function listThemes() {
  return THEMES.map((t) => ({ id: t.id, name: t.name, suits: t.suits }));
}
