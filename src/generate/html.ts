// Tiny HTML helpers for safe static generation. All user/scraped content passes
// through esc() before hitting the page — the generated site must never inject
// unescaped scraped strings.

export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

/** Escape for use inside a double-quoted attribute. */
export function attr(s: unknown): string {
  return esc(s);
}

/** Join truthy class names. */
export function cx(...names: Array<string | false | undefined>): string {
  return names.filter(Boolean).join(' ');
}

/**
 * Serialize an object for embedding inside a <script type="application/ld+json">
 * data element. JSON.stringify does NOT escape <, >, or &, so a value containing
 * "</script>" (or "<!--") would break out of the element — a stored-XSS vector
 * when the value comes from scraped content. Rewriting these three to \uXXXX
 * keeps the output valid JSON and safe inside the element. (The block is data,
 * not executed JS, so the U+2028/2029 JS-string caveat does not apply here.)
 */
export function jsonLdSafe(obj: unknown): string {
  return JSON.stringify(obj).replace(
    /[<>&]/g,
    (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'),
  );
}

// Only these URL schemes may appear in generated hrefs. Anything else (e.g.
// javascript:, data:) collapses to '#' so scraped/AI-supplied links can't
// smuggle script execution into the published site.
const SAFE_SCHEME = /^(https?:|mailto:|tel:|#|\/)/i;

export function safeHref(url: unknown): string {
  const s = String(url ?? '').trim();
  if (!s) return '#';
  return SAFE_SCHEME.test(s) ? s : '#';
}
