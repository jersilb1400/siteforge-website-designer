import { extractEmails, extractPhones, extractAddresses, collectSocials } from './contact';
import { extractPalette } from './color';

// HTML -> normalized StructuredContent using Workers' built-in HTMLRewriter
// (streaming, no DOM library). This is the shape written to
// source_content.data_json and shown to the client for review before use.

export interface StructuredContent {
  sourceTitle?: string;
  businessName?: string;
  tagline?: string;
  description?: string;
  about?: string;
  ogImage?: string;
  emails: string[];
  phones: string[];
  addresses: string[];
  hours?: string;
  socials: Record<string, string>;
  palette: string[];
  images: Array<{ url: string; alt?: string }>;
  navLinks: string[];
  headings: string[];
}

const MAX_TEXT = 40000; // cap accumulated text so pathological pages stay cheap
const MAX_IMAGES = 40;

function resolveUrl(base: string, href: string): string | null {
  try {
    const u = new URL(href, base);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

export async function extractFromHtml(html: string, baseUrl: string): Promise<StructuredContent> {
  const acc = {
    title: '',
    metaDesc: '',
    ogTitle: '',
    ogDesc: '',
    ogImage: '',
    themeColor: '',
    text: '',
    styleText: '',
    inlineStyles: '',
    headings: [] as string[],
    images: [] as Array<{ url: string; alt?: string }>,
    hrefs: [] as string[],
  };
  const addText = (t: string) => {
    if (acc.text.length < MAX_TEXT) acc.text += t;
  };

  const rewriter = new HTMLRewriter()
    .on('title', { text: (t) => { acc.title += t.text; } })
    .on('meta', {
      element(el) {
        const name = (el.getAttribute('name') || '').toLowerCase();
        const prop = (el.getAttribute('property') || '').toLowerCase();
        const content = el.getAttribute('content') || '';
        if (!content) return;
        if (name === 'description') acc.metaDesc ||= content;
        if (name === 'theme-color') acc.themeColor ||= content;
        if (prop === 'og:title') acc.ogTitle ||= content;
        if (prop === 'og:description') acc.ogDesc ||= content;
        if (prop === 'og:image') acc.ogImage ||= content;
      },
    })
    .on('h1, h2, h3', {
      element() {
        acc.headings.push('');
      },
      text(t) {
        if (acc.headings.length) acc.headings[acc.headings.length - 1] += t.text;
      },
    })
    .on('img', {
      element(el) {
        if (acc.images.length >= MAX_IMAGES) return;
        const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
        const resolved = src ? resolveUrl(baseUrl, src) : null;
        if (resolved) acc.images.push({ url: resolved, alt: el.getAttribute('alt') || undefined });
      },
    })
    .on('a', {
      element(el) {
        const href = el.getAttribute('href') || '';
        if (!href) return;
        if (href.startsWith('mailto:')) addText(' ' + href.slice(7) + ' ');
        else if (href.startsWith('tel:')) addText(' ' + href.slice(4) + ' ');
        else {
          const resolved = resolveUrl(baseUrl, href);
          if (resolved) acc.hrefs.push(resolved);
        }
      },
    })
    .on('*[style]', {
      element(el) {
        if (acc.inlineStyles.length < MAX_TEXT) acc.inlineStyles += ';' + (el.getAttribute('style') || '');
      },
    })
    .on('style', { text: (t) => { if (acc.styleText.length < MAX_TEXT) acc.styleText += t.text; } })
    // Text-bearing content tags (skips script/style noise).
    .on('p, li, address, blockquote, td, dd, figcaption, span', {
      text: (t) => addText(t.text),
    });

  await rewriter.transform(new Response(html)).text();

  const headings = acc.headings.map((h) => h.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const text = acc.text.replace(/\s+/g, ' ').trim();

  return {
    sourceTitle: acc.title.trim() || undefined,
    businessName: (acc.ogTitle || acc.title).split(/[|–—\-·]/)[0]?.trim() || undefined,
    tagline: headings[0] || undefined,
    description: (acc.metaDesc || acc.ogDesc).trim() || undefined,
    about: text.slice(0, 600) || undefined,
    ogImage: acc.ogImage ? resolveUrl(baseUrl, acc.ogImage) || undefined : undefined,
    emails: extractEmails(text),
    phones: extractPhones(text),
    addresses: extractAddresses(text),
    socials: collectSocials(acc.hrefs),
    palette: extractPalette([acc.themeColor, acc.styleText, acc.inlineStyles].join(' ')),
    images: acc.images,
    navLinks: [...new Set(acc.hrefs)].slice(0, 30),
    headings: headings.slice(0, 20),
  };
}
