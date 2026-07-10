import type { PaletteTokens } from './palette';

// The fully-resolved input to rendering: everything a theme needs to produce a
// finished site. Assembled from the interview profile + confirmed source_content
// + generated copy. Persisted as builds.spec_json for reproducible rebuilds.

export interface SectionSpec {
  id: string; // page id (home | about | services | gallery | contact)
  label: string; // nav label
  file: string; // bundle filename (index.html | about.html | …)
  href: string; // nav href (same as file for multi-page sites)
}

export interface GeneratedContent {
  heroHeadline: string;
  heroSub: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  aboutTitle: string;
  aboutBody: string[]; // paragraphs
  servicesTitle: string;
  services: Array<{ name: string; desc: string }>;
  highlights: string[];
  ctaTitle: string;
  ctaBody: string;
}

export interface SiteImage {
  src: string; // absolute URL or preview-relative path
  alt: string;
}

export interface SiteSpec {
  projectId: string;
  themeId: string;
  business: {
    name: string;
    tagline: string;
    industry: string;
    tone: string;
    story: string;
  };
  contact: {
    email: string;
    phone: string;
    address: string;
    hours: string;
    socials: Record<string, string>;
  };
  sections: SectionSpec[];
  palette: PaletteTokens;
  images: SiteImage[];
  content: GeneratedContent;
  // Optional bespoke design-director overrides layered on the theme skeleton.
  design?: {
    fontDisplay: string;
    fontBody: string;
    fontHref: string;
    signatureCss: string;
    rationale?: string;
  };
  generatedAt: string;
}

export function sectionFile(id: string): string {
  return id === 'home' ? 'index.html' : `${id}.html`;
}

function section(id: string, label: string): SectionSpec {
  const file = sectionFile(id);
  return { id, label, file, href: file };
}

// Map interview "pages" to multi-page section files. Synonyms collapse to one
// page (Menu/Services/Ministries → services.html) with the first label kept.
const PAGE_TO_SECTION: Record<string, { id: string; label: string }> = {
  Home: { id: 'home', label: 'Home' },
  About: { id: 'about', label: 'About' },
  'Our Mission': { id: 'about', label: 'Mission' },
  Services: { id: 'services', label: 'Services' },
  Menu: { id: 'services', label: 'Menu' },
  Ministries: { id: 'services', label: 'Ministries' },
  Programs: { id: 'services', label: 'Programs' },
  Shop: { id: 'services', label: 'Shop' },
  Work: { id: 'services', label: 'Work' },
  Book: { id: 'contact', label: 'Book' },
  Testimonials: { id: 'about', label: 'Testimonials' },
  Reviews: { id: 'about', label: 'Reviews' },
  Gallery: { id: 'gallery', label: 'Gallery' },
  Contact: { id: 'contact', label: 'Contact' },
  'Location & Hours': { id: 'contact', label: 'Visit' },
  Visit: { id: 'contact', label: 'Visit' },
  'Get a Quote': { id: 'contact', label: 'Get a Quote' },
  'Service Area': { id: 'about', label: 'Service Area' },
};

export function sectionsForPages(pages: string[]): SectionSpec[] {
  const seen = new Set<string>();
  const out: SectionSpec[] = [section('home', 'Home')];
  seen.add('home');
  for (const p of pages) {
    const s = PAGE_TO_SECTION[p];
    if (s && !seen.has(s.id)) {
      out.push(section(s.id, s.label));
      seen.add(s.id);
    }
  }
  // Always end with contact.
  if (!seen.has('contact')) out.push(section('contact', 'Contact'));
  return out;
}

/** Href for the contact (or Book/Visit) page in this site's nav. */
export function contactHref(sections: SectionSpec[]): string {
  return sections.find((s) => s.id === 'contact')?.href ?? 'contact.html';
}

/** Href for a section id, falling back to a sensible default file. */
export function hrefFor(sections: SectionSpec[], id: string): string {
  return sections.find((s) => s.id === id)?.href ?? sectionFile(id);
}
