import type { PaletteTokens } from './palette';

// The fully-resolved input to rendering: everything a theme needs to produce a
// finished site. Assembled from the interview profile + confirmed source_content
// + generated copy. Persisted as builds.spec_json for reproducible rebuilds.

export interface SectionSpec {
  id: string; // anchor id + nav target
  label: string; // nav label
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

// Map interview "pages" to the single-page section set we render for v1
// previews (anchored nav). Multi-page output is a later enhancement.
const PAGE_TO_SECTION: Record<string, SectionSpec> = {
  Home: { id: 'home', label: 'Home' },
  About: { id: 'about', label: 'About' },
  'Our Mission': { id: 'about', label: 'Mission' },
  Services: { id: 'services', label: 'Services' },
  Menu: { id: 'services', label: 'Menu' },
  Ministries: { id: 'services', label: 'Ministries' },
  Programs: { id: 'services', label: 'Programs' },
  Shop: { id: 'services', label: 'Shop' },
  Work: { id: 'services', label: 'Work' },
  Gallery: { id: 'gallery', label: 'Gallery' },
  Contact: { id: 'contact', label: 'Contact' },
  'Location & Hours': { id: 'contact', label: 'Visit' },
  Visit: { id: 'contact', label: 'Visit' },
};

export function sectionsForPages(pages: string[]): SectionSpec[] {
  const seen = new Set<string>();
  const out: SectionSpec[] = [{ id: 'home', label: 'Home' }];
  seen.add('home');
  for (const p of pages) {
    const s = PAGE_TO_SECTION[p];
    if (s && !seen.has(s.id)) {
      out.push(s);
      seen.add(s.id);
    }
  }
  // Always end with contact.
  if (!seen.has('contact')) out.push({ id: 'contact', label: 'Contact' });
  return out;
}
