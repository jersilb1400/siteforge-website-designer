import type { PaletteTokens } from '../palette';

// A Theme supplies the visual identity: font pairing, a signature CSS system,
// and a few layout switches the section renderer reads. Sections emit stable,
// semantic HTML with `sf-` class names; the theme's CSS styles them. This keeps
// output dependency-light (inline CSS, no CDN) for Lighthouse while still giving
// each theme a genuinely different look.

export interface ThemeFonts {
  display: string; // CSS font-family value for headings
  body: string; // CSS font-family value for body
  googleHref?: string; // optional <link> to Google Fonts
}

export interface ThemeLayout {
  hero: 'split' | 'centered' | 'full-bleed';
  nav: 'left' | 'center';
  services: 'cards' | 'list' | 'grid';
  corners: number; // border-radius in px (0 = sharp)
}

export interface Theme {
  id: string;
  name: string;
  // Which industries/tones this theme suits best (for auto-selection).
  suits: { industries?: string[]; tones?: string[] };
  fonts: ThemeFonts;
  layout: ThemeLayout;
  // Full stylesheet, given resolved palette tokens. Should target sf- classes.
  css(t: PaletteTokens): string;
}
