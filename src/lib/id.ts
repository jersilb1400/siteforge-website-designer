// Sortable, URL-safe IDs. Not a full ULID implementation, but the same
// property that matters here: lexicographic order tracks creation time, so
// rows sort chronologically by primary key without a separate timestamp index.
// Format: <8-char base36 ms timestamp><12 chars crypto random base36>.

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function randomBase36(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    // bytes[i] is 0-255; map into the 36-char alphabet. Slight modulo bias is
    // irrelevant for collision-resistant IDs at this length.
    out += ALPHABET[bytes[i]! % 36];
  }
  return out;
}

/**
 * Generate a time-sortable ID, optionally prefixed (e.g. id('proj')).
 * Prefixes make IDs self-describing in logs and URLs.
 */
export function id(prefix?: string): string {
  const ts = Date.now().toString(36).padStart(8, '0');
  const rand = randomBase36(12);
  const core = ts + rand;
  return prefix ? `${prefix}_${core}` : core;
}
