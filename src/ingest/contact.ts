// Pure extractors for contact details and social links from page text/HTML.
// Kept side-effect-free so they're fully unit-testable in Node (no runtime
// bindings), and reused across the website / Facebook / Google ingestion paths.

const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;

// Phone shapes common to small US/CA businesses: (555) 123-4567, 555-123-4567,
// +1 555.123.4567, 5551234567. Deliberately conservative to limit false hits.
const PHONE_RE =
  /(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

// Street suffixes signal a mailing address line.
const STREET_RE =
  /\b\d{1,6}\s+[\w.'-]+(?:\s+[\w.'-]+)*\s+(?:st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|ct|court|pl|place|pkwy|parkway|hwy|highway|suite|ste|unit)\b\.?/gi;

function dedupe(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
}

export function extractEmails(text: string): string[] {
  // Ignore obvious asset filenames that can match (e.g. sprite@2x.png handled
  // by the TLD requirement, but guard against image extensions anyway).
  return dedupe((text.match(EMAIL_RE) ?? []).filter((e) => !/\.(png|jpe?g|gif|webp|svg)$/i.test(e)))
    .map((e) => e.toLowerCase());
}

export function extractPhones(text: string): string[] {
  const hits = text.match(PHONE_RE) ?? [];
  // Normalize whitespace; drop anything with fewer than 10 digits.
  return dedupe(
    hits
      .map((h) => h.replace(/\s+/g, ' ').trim())
      .filter((h) => (h.replace(/\D/g, '').length >= 10)),
  );
}

export function extractAddresses(text: string): string[] {
  return dedupe((text.match(STREET_RE) ?? []).map((a) => a.replace(/\s+/g, ' ').trim())).slice(0, 5);
}

// Map outbound links to a normalized social platform key.
const SOCIAL_HOSTS: Array<[RegExp, string]> = [
  [/facebook\.com/i, 'facebook'],
  [/instagram\.com/i, 'instagram'],
  [/(twitter\.com|x\.com)/i, 'twitter'],
  [/linkedin\.com/i, 'linkedin'],
  [/youtube\.com|youtu\.be/i, 'youtube'],
  [/tiktok\.com/i, 'tiktok'],
  [/g\.page|google\.com\/maps|maps\.app\.goo\.gl/i, 'google'],
];

export function classifySocial(url: string): string | null {
  for (const [re, key] of SOCIAL_HOSTS) if (re.test(url)) return key;
  return null;
}

/** Collapse a list of hrefs into a { platform: firstUrl } map. */
export function collectSocials(hrefs: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const href of hrefs) {
    const key = classifySocial(href);
    if (key && !out[key]) out[key] = href;
  }
  return out;
}
