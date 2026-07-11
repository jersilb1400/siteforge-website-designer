// Pure palette extraction. Browser Rendering can later add dominant-color
// analysis from a screenshot; for now we harvest declared colors (theme-color
// meta, inline styles, style blocks), rank by frequency, and return a small
// candidate palette for the client to confirm. Side-effect-free = testable.

const HEX_RE = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi;
const RGB_RE = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;

function normHex(h: string): string {
  let x = h.toLowerCase();
  if (x.length === 4) x = '#' + [...x.slice(1)].map((c) => c + c).join('');
  return x;
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// Colors too close to pure white/black are almost always background/text, not
// brand colors — down-rank them so real accents surface.
function isNeutral(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const light = (max + min) / 2;
  const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255) || 1);
  return sat < 0.12 || light > 244 || light < 12;
}

/**
 * Extract a ranked candidate palette (up to `limit`) from raw CSS/markup.
 * Brand-ish (saturated, mid-tone) colors rank above neutrals; neutrals are
 * still included at the tail so pure minimal sites aren't left empty.
 */
export function extractPalette(css: string, limit = 6): string[] {
  const counts = new Map<string, number>();
  const bump = (hex: string) => counts.set(hex, (counts.get(hex) ?? 0) + 1);

  for (const m of css.match(HEX_RE) ?? []) bump(normHex(m));
  let rm: RegExpExecArray | null;
  RGB_RE.lastIndex = 0;
  while ((rm = RGB_RE.exec(css))) bump(rgbToHex(+rm[1]!, +rm[2]!, +rm[3]!));

  const all = [...counts.entries()];
  const brandish = all.filter(([h]) => !isNeutral(h)).sort((a, b) => b[1] - a[1]);
  const neutral = all.filter(([h]) => isNeutral(h)).sort((a, b) => b[1] - a[1]);

  return [...brandish, ...neutral].slice(0, limit).map(([h]) => h);
}
