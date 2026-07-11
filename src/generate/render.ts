import type { SiteSpec } from './spec';
import { getTheme } from './themes';
import { renderBody, headMeta, documentTitle, pagesToRender } from './sections';
import { esc } from './html';

// Render a multi-page static site: one HTML file per nav item, shared inline
// CSS/fonts. Preview/site servers already stream any R2 key under the build.

export interface RenderedBundle {
  files: Record<string, string>;
  themeId: string;
}

export function renderSite(spec: SiteSpec): RenderedBundle {
  const theme = getTheme(spec.themeId);
  const d = spec.design;
  const overrideCss = d
    ? `:root{--font-display:${d.fontDisplay};--font-body:${d.fontBody}}\n${d.signatureCss}`
    : '';
  const css = theme.css(spec.palette) + overrideCss;
  const fontHref = d?.fontHref || theme.fonts.googleHref;
  const fontLink = fontHref
    ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${fontHref}" rel="stylesheet">`
    : '';

  const files: Record<string, string> = {};
  for (const page of pagesToRender(spec)) {
    const title = documentTitle(spec, page.id);
    files[page.file] = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
${fontLink}
${headMeta(spec, page.id)}
<style>${css}</style>
</head>
<body class="sf-page sf-page--${page.id}">
${renderBody(spec, theme, page.id)}
</body>
</html>`;
  }

  return { files, themeId: theme.id };
}
