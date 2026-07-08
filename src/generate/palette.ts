// Resolve a usable set of design tokens from whatever brand signal we have:
// explicit hex codes from the interview, colors scraped from the existing site,
// or a tone-appropriate generated palette. Pure + testable.

export interface PaletteTokens {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  brand: string;
  brandInk: string; // readable text on `brand`
  link: string; // brand adjusted to meet AA as text on `bg`
  accent: string; // adjusted to meet AA as text on `bg`
}

const HEX_RE = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi;

function normHex(h: string): string {
  let x = h.toLowerCase();
  if (x.length === 4) x = '#' + [...x.slice(1)].map((c) => c + c).join('');
  return x;
}

function rgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// WCAG relative luminance, used to pick readable text on a colored background.
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Best of black/white for text over `bg`, per WCAG contrast. */
export function readableInk(bg: string): string {
  return luminance(bg) > 0.4 ? '#111318' : '#ffffff';
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Darken (on light bg) or lighten (on dark bg) `fg` toward black/white until it
 * meets `ratio` contrast against `bg`, so brand/accent colors are safe as text.
 * WCAG AA body text is 4.5:1.
 */
export function adjustForContrast(fg: string, bg: string, ratio = 4.5): string {
  const target = luminance(bg) > 0.4 ? '#000000' : '#ffffff';
  let out = fg;
  for (let t = 0; t <= 1.0001 && contrastRatio(out, bg) < ratio; t += 0.06) {
    out = mix(fg, target, t);
  }
  return out;
}

// Tone-driven fallback brand/accent pairs. Deliberately not the AI-default
// cream+terracotta — each is chosen for the tone word.
const TONE_PALETTES: Record<string, { brand: string; accent: string; warm: boolean }> = {
  Professional: { brand: '#1f3a5f', accent: '#c9a24b', warm: false },
  Warm: { brand: '#a8552f', accent: '#e0a458', warm: true },
  Bold: { brand: '#7c2d3a', accent: '#e3b23c', warm: true },
  Minimal: { brand: '#2b2b2b', accent: '#6f7a70', warm: false },
};

function pickBrandFromScrape(hexes: string[]): string | null {
  // First color that isn't near-white/near-black is the likely brand color.
  for (const raw of hexes) {
    const h = normHex(raw);
    const l = luminance(h);
    if (l > 0.03 && l < 0.75) return h;
  }
  return null;
}

/**
 * Resolve tokens. Priority: explicit interview hexes > scraped palette >
 * tone default. `generatePalette` forces the tone default even if colors exist.
 */
export function resolvePalette(opts: {
  brandColors?: string;
  generatePalette?: boolean;
  scrapedPalette?: string[];
  tone?: string;
}): PaletteTokens {
  const tone = opts.tone && TONE_PALETTES[opts.tone] ? opts.tone : 'Professional';
  const toneP = TONE_PALETTES[tone]!;

  let brand = toneP.brand;
  let accent = toneP.accent;

  if (!opts.generatePalette) {
    const explicit = (opts.brandColors?.match(HEX_RE) ?? []).map(normHex);
    if (explicit.length) {
      brand = explicit[0]!;
      accent = explicit[1] ?? accent;
    } else if (opts.scrapedPalette?.length) {
      const b = pickBrandFromScrape(opts.scrapedPalette);
      if (b) {
        brand = b;
        const others = opts.scrapedPalette.map(normHex).filter((h) => h !== b);
        accent = others[0] ?? accent;
      }
    }
  }

  // Neutral scaffold, subtly warmed for warm tones.
  const bg = toneP.warm ? '#fbf8f4' : '#f8f9fb';
  const ink = '#171a1f';
  return {
    bg,
    surface: '#ffffff',
    ink,
    muted: mix(ink, bg, 0.5),
    line: mix(ink, bg, 0.86),
    brand,
    brandInk: readableInk(brand),
    // brand/accent are safe as backgrounds as-is; when used as TEXT they must
    // pass AA against the page background, so derive adjusted variants.
    link: adjustForContrast(brand, bg, 4.5),
    accent: adjustForContrast(accent, bg, 4.5),
  };
}
