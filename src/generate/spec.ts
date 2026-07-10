import type { PaletteTokens } from './palette';
import type { CompositionResolved } from './composition/types';
import type { ImageRole } from './images/prompts';

// The fully-resolved input to rendering: everything a theme needs to produce a
// finished site. Assembled from the interview profile + confirmed source_content
// + generated copy. Persisted as builds.spec_json for reproducible rebuilds.

export interface SectionSpec {
  id: string; // page id (home | about | services | gallery | contact | team | faq | give | visit)
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
  /** Conversion kind: booking | donation | contact | services */
  ctaKind?: string;
  secondaryCtaLabel?: string;
  trustLine?: string;
  testimonials?: Array<{ quote: string; attribution: string }>;
  faq?: Array<{ q: string; a: string }>;
  team?: Array<{ name: string; role: string; bio?: string }>;
}

export interface SiteImage {
  src: string; // absolute URL or preview-relative path
  alt: string;
  role?: ImageRole;
  aspectRatio?: string;
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
  /** Confirmed logo asset, baked as media/logo.* in the bundle when present. */
  logo?: SiteImage;
  content: GeneratedContent;
  /** Guardrailed composition recipe (layout shape). */
  composition?: CompositionResolved;
  /** True when this build is a sales demo (may invent social proof). */
  demo?: boolean;
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
  return id === 'home' ? 'index.html' : id === 'visit' || id === 'give' ? `${id}.html` : `${id}.html`;
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
  Visit: { id: 'visit', label: 'Visit' },
  Give: { id: 'give', label: 'Give' },
  Donate: { id: 'give', label: 'Give' },
  Team: { id: 'team', label: 'Team' },
  Staff: { id: 'team', label: 'Team' },
  FAQ: { id: 'faq', label: 'FAQ' },
  'Get a Quote': { id: 'contact', label: 'Get a Quote' },
  'Service Area': { id: 'about', label: 'Service Area' },
};

export function sectionsForPages(
  pages: string[],
  extra?: Array<{ id: string; label: string }>,
): SectionSpec[] {
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
  for (const e of extra ?? []) {
    if (!seen.has(e.id)) {
      out.push(section(e.id, e.label));
      seen.add(e.id);
    }
  }
  // Always end with contact (unless visit/give already cover church flows — still keep contact).
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

/** First image matching role, else fall back by index / any image. */
export function imgByRole(
  spec: SiteSpec,
  role: ImageRole,
  fallbackIndex = 0,
): SiteImage | undefined {
  const byRole = spec.images.find((im) => im.role === role);
  if (byRole) return byRole;
  if (!spec.images.length) return undefined;
  return spec.images[fallbackIndex % spec.images.length];
}

/** All images for a role (e.g. service cards). */
export function imgsByRole(spec: SiteSpec, role: ImageRole): SiteImage[] {
  const matched = spec.images.filter((im) => im.role === role);
  return matched.length ? matched : [];
}
