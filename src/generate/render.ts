import type { SiteSpec } from './spec';
import { getTheme } from './themes';
import { renderBody, headMeta } from './sections';

// Render a complete, self-contained index.html (inline CSS, no CDN except an
// optional font stylesheet with preconnect). Returns the file map for the
// bundle. Multi-file output (about.html, etc.) can extend this later.

export interface RenderedBundle {
  files: Record<string, string>;
  themeId: string;
}

export function renderSite(spec: SiteSpec): RenderedBundle {
  const theme = getTheme(spec.themeId);
  // Bespoke design-director overrides (fonts + signature) layer AFTER the theme
  // CSS so they win, without touching the theme's tested structural rules.
  const d = spec.design;
  const overrideCss = d
    ? `:root{--font-display:${d.fontDisplay};--font-body:${d.fontBody}}\n${d.signatureCss}`
    : '';
  const css = theme.css(spec.palette) + overrideCss;
  const fontHref = d?.fontHref || theme.fonts.googleHref;
  const fontLink = fontHref
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${fontHref}" rel="stylesheet">`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeTitle(spec.business.name)}</title>
${fontLink}
${headMeta(spec)}
<style>${css}</style>
</head>
<body>
${renderBody(spec, theme)}
</body>
</html>`;

  return { files: { 'index.html': html }, themeId: theme.id };
}

function escapeTitle(s: string): string {
  return String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!);
}
