import { describe, it, expect } from 'vitest';
import { resolvePalette, readableInk, luminance } from '../src/generate/palette';

// WCAG contrast ratio, mirrored here to assert AA compliance of resolved tokens.
function contrast(a: string, b: string): number {
  const [hi, lo] = luminance(a) > luminance(b) ? [luminance(a), luminance(b)] : [luminance(b), luminance(a)];
  return (hi + 0.05) / (lo + 0.05);
}
import { sectionsForPages } from '../src/generate/spec';
import { selectTheme } from '../src/generate/themes';
import { jsonLdSafe, safeHref, esc } from '../src/generate/html';

describe('output safety (reviewer HIGH findings)', () => {
  it('jsonLdSafe neutralizes </script> breakout from scraped values', () => {
    const out = jsonLdSafe({ name: 'Evil</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('\\u003c');
    // Still valid JSON that round-trips to the original value.
    expect(JSON.parse(out).name).toBe('Evil</script><script>alert(1)</script>');
  });

  it('safeHref allows real schemes and blocks javascript:', () => {
    expect(safeHref('https://x.com')).toBe('https://x.com');
    expect(safeHref('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(safeHref('tel:+15550102020')).toBe('tel:+15550102020');
    expect(safeHref('#contact')).toBe('#contact');
    expect(safeHref('javascript:alert(1)')).toBe('#');
    expect(safeHref('  JavaScript:alert(1)')).toBe('#');
    expect(safeHref('data:text/html,x')).toBe('#');
  });

  it('esc escapes angle brackets and quotes for attributes/text', () => {
    expect(esc('<img src=x onerror=1>')).toBe('&lt;img src=x onerror=1&gt;');
    expect(esc(`"'&`)).toBe('&quot;&#39;&amp;');
  });
});

describe('palette resolution', () => {
  it('uses explicit hex codes from the interview (brand kept raw for backgrounds)', () => {
    const p = resolvePalette({ brandColors: '#0f766e and gold #f59e0b' });
    expect(p.brand).toBe('#0f766e');
  });

  it('adjusts text-role colors (link/accent) to meet WCAG AA on the background', () => {
    const p = resolvePalette({ brandColors: '#0f766e and gold #f59e0b' });
    expect(contrast(p.link, p.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.accent, p.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('forces the tone default when generatePalette is set', () => {
    const p = resolvePalette({ brandColors: '#0f766e', generatePalette: true, tone: 'Bold' });
    expect(p.brand).not.toBe('#0f766e');
  });

  it('falls back to a scraped brand color, skipping near-white/black', () => {
    const p = resolvePalette({ scrapedPalette: ['#ffffff', '#1a1a1a', '#7c2d3a'] });
    expect(p.brand).toBe('#7c2d3a');
  });

  it('picks readable ink for contrast', () => {
    expect(readableInk('#111318')).toBe('#ffffff');
    expect(readableInk('#f8f9fb')).toBe('#111318');
    expect(luminance('#ffffff')).toBeGreaterThan(luminance('#000000'));
  });
});

describe('section mapping', () => {
  it('always begins with home and ends with contact', () => {
    const s = sectionsForPages(['Menu', 'Gallery']);
    expect(s[0]?.id).toBe('home');
    expect(s.at(-1)?.id).toBe('contact');
  });

  it('collapses synonymous pages to one section', () => {
    const ids = sectionsForPages(['Menu', 'Services', 'Ministries']).map((x) => x.id);
    expect(ids.filter((i) => i === 'services').length).toBe(1);
  });
});

describe('theme selection', () => {
  it('matches industry first', () => {
    expect(selectTheme('Church / Ministry', 'Bold').id).toBe('sanctuary');
    expect(selectTheme('Restaurant / Cafe', 'Minimal').id).toBe('storefront');
  });
  it('falls back to default for unknown industry/tone', () => {
    expect(selectTheme('Something else', undefined).id).toBe('atelier');
  });
});
