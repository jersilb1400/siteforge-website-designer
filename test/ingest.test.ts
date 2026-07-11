import { describe, it, expect } from 'vitest';
import { extractEmails, extractPhones, extractAddresses, collectSocials, classifySocial } from '../src/ingest/contact';
import { extractPalette } from '../src/ingest/color';
import { robotsAllows } from '../src/ingest/render';

describe('contact extraction', () => {
  const text =
    'Reach us at Hello@Maplewood.Example or book by phone (555) 314-2700. ' +
    'Visit 221 Maplewood Avenue, Rivertown. Logo file sprite@2x.png should be ignored.';

  it('finds and lowercases emails, ignoring image filenames', () => {
    expect(extractEmails(text)).toEqual(['hello@maplewood.example']);
  });

  it('finds phone numbers with >= 10 digits', () => {
    expect(extractPhones(text)).toContain('(555) 314-2700');
  });

  it('finds street addresses', () => {
    expect(extractAddresses(text)[0]).toMatch(/221 Maplewood Avenue/);
  });

  it('classifies and collects social links', () => {
    expect(classifySocial('https://facebook.com/x')).toBe('facebook');
    expect(classifySocial('https://example.com')).toBeNull();
    const socials = collectSocials([
      'https://facebook.com/maplewood',
      'https://instagram.com/maplewood',
      'https://facebook.com/other', // duplicate platform ignored
    ]);
    expect(socials).toEqual({ facebook: 'https://facebook.com/maplewood', instagram: 'https://instagram.com/maplewood' });
  });
});

describe('palette extraction', () => {
  it('ranks brand colors above neutrals', () => {
    const css = '#0f766e #0f766e #ffffff #f59e0b color: rgb(15,118,110)';
    const palette = extractPalette(css, 4);
    expect(palette[0]).toBe('#0f766e'); // most frequent brand color first
    expect(palette).toContain('#f59e0b'); // accent present
  });

  it('expands shorthand hex', () => {
    expect(extractPalette('#0a0 background', 6)).toContain('#00aa00');
  });
});

describe('robots.txt evaluation', () => {
  it('blocks disallowed paths for the star group', () => {
    const robots = 'User-agent: *\nDisallow: /private';
    expect(robotsAllows(robots, '/private/thing')).toBe(false);
    expect(robotsAllows(robots, '/public')).toBe(true);
  });

  it('an empty Disallow allows everything', () => {
    expect(robotsAllows('User-agent: *\nDisallow:', '/anything')).toBe(true);
  });

  it('prefers our own UA group when present', () => {
    const robots = 'User-agent: SiteForgeBot\nDisallow:\n\nUser-agent: *\nDisallow: /';
    expect(robotsAllows(robots, '/x')).toBe(true); // our group allows all
  });
});
