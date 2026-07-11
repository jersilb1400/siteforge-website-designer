import { pagesForIndustry } from '../../interview/questions';
import { selectTheme } from '../themes';

// Industry → seed content for sales demos. Pure data + helpers so demos can be
// built without a full interview. Catalog services feed generation so previews
// look real even without Anthropic.

export interface DemoService {
  name: string;
  desc: string;
}

export interface DemoIndustrySeed {
  industry: string;
  themeId: string;
  /** Force a composition recipe so demos stay structurally distinct. */
  recipeId: string;
  tone: string;
  goals: string[];
  pages: string[];
  defaultTagline: string;
  defaultAbout: string;
  hours: string;
  servicesTitle: string;
  services: DemoService[];
  highlights: string[];
  ctaLabel: string;
  /** Soft brand/accent hints for the palette resolver (space-separated hex). */
  brandColors: string;
}

export interface DemoBrief {
  businessName: string;
  industry: string;
  tagline?: string;
  blurb?: string;
  phone?: string;
  email?: string;
  city?: string;
  logoUrl?: string;
  themeId?: string;
}

/** Interview-answer map shape consumed by buildProfile / assembleSpec. */
export type DemoAnswers = Record<string, string | string[] | boolean>;

const SPA: DemoIndustrySeed = {
  industry: 'Day spa / Salon',
  themeId: 'haven',
  recipeId: 'editorial-luxury',
  tone: 'Warm',
  goals: ['Take bookings or appointments', 'Share information & build trust', 'Generate leads / inquiries'],
  pages: pagesForIndustry('Day spa / Salon'),
  defaultTagline: 'Quiet luxury, unhurried care',
  defaultAbout:
    'A calm retreat for skin, hair, and body. We pair skilled therapists with quiet, softly lit rooms and thoughtfully chosen products so every visit feels slower than the rest of your day.',
  hours: 'Tue–Sat 9:00–19:00 · Sun by appointment',
  servicesTitle: 'Rituals & services',
  services: [
    { name: 'Signature Facial', desc: 'A custom cleanse, gentle extraction, and lit-from-within glow, tailored to your skin.' },
    { name: 'Hot Stone Massage', desc: 'Warm basalt stones and unhurried pressure that melt tension from the inside out.' },
    { name: 'Hair Color & Cut', desc: 'Precision cuts and dimensional color, shaped around how you actually wear your hair.' },
    { name: 'Nail Rituals', desc: 'A slow manicure and pedicure ritual with lasting polish and real hand and foot care.' },
    { name: 'Bridal Package', desc: 'Hair, makeup, and calm preparation for you and your whole party, timed to the day.' },
  ],
  highlights: ['Licensed therapists', 'Quiet private suites', 'Clean beauty products'],
  ctaLabel: 'Book an appointment',
  brandColors: '#3E5245 #A9824F',
};

const SEEDS: DemoIndustrySeed[] = [
  SPA,
  {
    industry: 'Church / Ministry',
    themeId: 'sanctuary',
    recipeId: 'reverent-sanctuary',
    tone: 'Warm',
    goals: ['Share information & build trust', 'Promote events', 'Collect donations'],
    pages: pagesForIndustry('Church / Ministry'),
    defaultTagline: 'A place to belong',
    defaultAbout:
      'We are a welcoming community gathered around faith, service, and neighborly care. Sundays are for worship; the week is for living it out together.',
    hours: 'Sunday worship 10:00 · Office Mon–Thu 9:00–16:00',
    servicesTitle: 'Ministries',
    services: [
      { name: 'Sunday Worship', desc: 'Gather for teaching, prayer, and song each week.' },
      { name: 'Kids & Youth', desc: 'Safe, age-ready spaces to grow in faith.' },
      { name: 'Community Care', desc: 'Meals, visits, and practical help for neighbors.' },
      { name: 'Small Groups', desc: 'Weeknight circles for study and friendship.' },
    ],
    highlights: ['All are welcome', 'Family-friendly', 'Local outreach'],
    ctaLabel: 'Plan your visit',
    brandColors: '#3D4F3F #B08D57',
  },
  {
    industry: 'Restaurant / Cafe',
    themeId: 'storefront',
    recipeId: 'warm-hospitality',
    tone: 'Bold',
    goals: ['Share information & build trust', 'Generate leads / inquiries', 'Promote events'],
    pages: pagesForIndustry('Restaurant / Cafe'),
    defaultTagline: 'Made fresh, served with care',
    defaultAbout:
      'A neighborhood kitchen focused on seasonal ingredients and a warm table. Come for coffee, stay for dinner, leave as a regular.',
    hours: 'Mon–Thu 8:00–21:00 · Fri–Sat 8:00–22:00 · Sun 9:00–15:00',
    servicesTitle: 'What we offer',
    services: [
      { name: 'Breakfast & Brunch', desc: 'Eggs, pastries, and strong coffee from open until early afternoon.' },
      { name: 'Seasonal Menu', desc: 'Lunch and dinner plates that change with the market.' },
      { name: 'Catering', desc: 'Office lunches and private events, packed with care.' },
      { name: 'Private Dining', desc: 'A quiet room for celebrations and team dinners.' },
    ],
    highlights: ['Local ingredients', 'Walk-ins welcome', 'Takeout ready'],
    ctaLabel: 'Reserve a table',
    brandColors: '#8B2E1F #1A1A1A',
  },
  {
    industry: 'Professional services (law, accounting, consulting)',
    themeId: 'atelier',
    recipeId: 'clean-clinic',
    tone: 'Professional',
    goals: ['Generate leads / inquiries', 'Share information & build trust'],
    pages: pagesForIndustry('Professional services (law, accounting, consulting)'),
    defaultTagline: 'Clear counsel. Steady partnership.',
    defaultAbout:
      'We help owners and families navigate complex decisions with plain language and careful work. You get a partner who prepares thoroughly and communicates early.',
    hours: 'Mon–Fri 9:00–17:00 · By appointment',
    servicesTitle: 'How we help',
    services: [
      { name: 'Strategy Sessions', desc: 'Focused working sessions to clarify goals and next steps.' },
      { name: 'Ongoing Counsel', desc: 'Retainer support for recurring questions and reviews.' },
      { name: 'Document Review', desc: 'Contracts and filings checked with care before you sign.' },
      { name: 'Workshops', desc: 'Team briefings that turn policy into practice.' },
    ],
    highlights: ['Confidential', 'Responsive', 'Plain-language advice'],
    ctaLabel: 'Schedule a consult',
    brandColors: '#1F3A5F #6B7C8F',
  },
  {
    industry: 'Health & wellness',
    themeId: 'meridian',
    recipeId: 'clean-clinic',
    tone: 'Warm',
    goals: ['Take bookings or appointments', 'Share information & build trust'],
    pages: pagesForIndustry('Health & wellness'),
    defaultTagline: 'Care that meets you where you are',
    defaultAbout:
      'A practice built around listening first. We combine evidence-based care with a calm setting so you leave clearer, steadier, and supported.',
    hours: 'Mon–Fri 8:00–18:00 · Sat 9:00–13:00',
    servicesTitle: 'Care offerings',
    services: [
      { name: 'Initial Consultation', desc: 'A thorough first visit to map goals and a plan.' },
      { name: 'Ongoing Care', desc: 'Follow-ups that adjust as you progress.' },
      { name: 'Wellness Programs', desc: 'Structured plans for strength, recovery, or stress.' },
      { name: 'Telehealth', desc: 'Secure video visits when you cannot come in.' },
    ],
    highlights: ['Licensed clinicians', 'Insurance-friendly', 'Same-week openings'],
    ctaLabel: 'Book an appointment',
    brandColors: '#3E6B6B #A67C52',
  },
  {
    industry: 'Home & trade services',
    themeId: 'forge',
    recipeId: 'craft-trade',
    tone: 'Bold',
    goals: ['Generate leads / inquiries', 'Take bookings or appointments'],
    pages: pagesForIndustry('Home & trade services'),
    defaultTagline: 'Done right the first time',
    defaultAbout:
      'Licensed tradespeople who show up on time, protect your home, and explain the work before we start. Honest estimates. Clean job sites. Work you can stand behind.',
    hours: 'Mon–Sat 7:00–18:00 · Emergency call-outs available',
    servicesTitle: 'Services',
    services: [
      { name: 'Repairs', desc: 'Fast diagnosis and lasting fixes for everyday problems.' },
      { name: 'Installations', desc: 'New fixtures and systems installed to code.' },
      { name: 'Maintenance Plans', desc: 'Seasonal checkups that catch issues early.' },
      { name: 'Remodels', desc: 'Scoped upgrades with clear timelines and walkthroughs.' },
    ],
    highlights: ['Licensed & insured', 'Upfront pricing', 'Local crew'],
    ctaLabel: 'Get a quote',
    brandColors: '#C45C26 #1C1C1C',
  },
  {
    industry: 'Retail / shop',
    themeId: 'storefront',
    recipeId: 'warm-hospitality',
    tone: 'Bold',
    goals: ['Sell a few products (e-commerce-lite)', 'Share information & build trust'],
    pages: pagesForIndustry('Retail / shop'),
    defaultTagline: 'Curated goods for everyday living',
    defaultAbout:
      'A carefully edited shop of useful, beautiful things. Visit in person for advice, or browse online and pick up when it suits you.',
    hours: 'Mon–Sat 10:00–18:00 · Sun 11:00–16:00',
    servicesTitle: 'In the shop',
    services: [
      { name: 'New Arrivals', desc: 'Fresh finds rotated weekly from trusted makers.' },
      { name: 'Gift Wrapping', desc: 'Complimentary wrap for every purchase.' },
      { name: 'Special Orders', desc: 'We will source sizes and styles on request.' },
      { name: 'Workshops', desc: 'Hands-on evenings with makers and staff.' },
    ],
    highlights: ['Local makers', 'Easy returns', 'In-store pickup'],
    ctaLabel: 'Visit the shop',
    brandColors: '#2C3E50 #D4A017',
  },
  {
    industry: 'Nonprofit',
    themeId: 'ledger',
    recipeId: 'mission-ledger',
    tone: 'Professional',
    goals: ['Collect donations', 'Share information & build trust', 'Grow an email list'],
    pages: pagesForIndustry('Nonprofit'),
    defaultTagline: 'Neighbors helping neighbors',
    defaultAbout:
      'We exist to turn generosity into measurable local impact. Programs are designed with the community, funded transparently, and reported clearly.',
    hours: 'Office Mon–Fri 9:00–17:00',
    servicesTitle: 'Programs',
    services: [
      { name: 'Direct Aid', desc: 'Food, clothing, and emergency support for families.' },
      { name: 'Education', desc: 'Workshops and tutoring that build lasting skills.' },
      { name: 'Volunteer Corps', desc: 'Trained neighbors ready for weekend projects.' },
      { name: 'Advocacy', desc: 'Local policy work that removes barriers to care.' },
    ],
    highlights: ['Transparent finances', 'Volunteer-powered', 'Local focus'],
    ctaLabel: 'Donate',
    brandColors: '#1B4F72 #5D6D7E',
  },
  {
    industry: 'Personal brand / portfolio',
    themeId: 'gallery',
    recipeId: 'mission-ledger',
    tone: 'Minimal',
    goals: ['Generate leads / inquiries', 'Share information & build trust'],
    pages: pagesForIndustry('Personal brand / portfolio'),
    defaultTagline: 'Selected work & collaborations',
    defaultAbout:
      'I help clients tell clear stories through design and craft. Projects range from brand systems to one-off commissions — always with a sharp point of view.',
    hours: 'Available for select projects · Reply within 2 business days',
    servicesTitle: 'Services',
    services: [
      { name: 'Brand Identity', desc: 'Name, mark, and system for a coherent presence.' },
      { name: 'Editorial Design', desc: 'Layouts that make complex ideas readable.' },
      { name: 'Art Direction', desc: 'Visual leadership for campaigns and shoots.' },
      { name: 'Consulting', desc: 'Short engagements to unblock a stuck project.' },
    ],
    highlights: ['Selective roster', 'Remote-friendly', 'Clear scopes'],
    ctaLabel: 'Start a project',
    brandColors: '#111111 #6E6E6E',
  },
  {
    industry: 'Other',
    themeId: 'atelier',
    recipeId: 'editorial-luxury',
    tone: 'Professional',
    goals: ['Generate leads / inquiries', 'Share information & build trust'],
    pages: pagesForIndustry('Other'),
    defaultTagline: 'Built for how you work',
    defaultAbout:
      'A modern site that introduces who you are, what you offer, and how to get in touch — clear, fast, and ready to grow with you.',
    hours: 'Mon–Fri 9:00–17:00',
    servicesTitle: 'What we do',
    services: [
      { name: 'Core Offering', desc: 'The primary service clients come to you for.' },
      { name: 'Consultations', desc: 'Discovery calls to match needs with a plan.' },
      { name: 'Support', desc: 'Follow-through after the first engagement.' },
      { name: 'Resources', desc: 'Guides and FAQs that answer common questions.' },
    ],
    highlights: ['Clear next steps', 'Human replies', 'Mobile-first'],
    ctaLabel: 'Get in touch',
    brandColors: '#2F4F4F #8B7355',
  },
];

const BY_INDUSTRY = new Map(SEEDS.map((s) => [s.industry, s]));

export function listDemoIndustries(): Array<{ industry: string; themeId: string; themeName: string }> {
  return SEEDS.map((s) => ({
    industry: s.industry,
    themeId: s.themeId,
    themeName: selectTheme(s.industry, s.tone).name,
  }));
}

export function getDemoSeed(industry: string): DemoIndustrySeed | null {
  return BY_INDUSTRY.get(industry) ?? null;
}

export function isDemoIndustry(industry: string): boolean {
  return BY_INDUSTRY.has(industry);
}

/**
 * Build the interview-answer map a demo needs so assembleSpec / buildProfile
 * work without a live interview. Optional brief fields override catalog defaults.
 */
export function buildDemoAnswers(brief: DemoBrief, seed: DemoIndustrySeed): DemoAnswers {
  const name = brief.businessName.trim();
  const city = brief.city?.trim();
  const address = city ? `${city}` : '';
  const about = brief.blurb?.trim() || seed.defaultAbout;
  const tagline = brief.tagline?.trim() || seed.defaultTagline;

  return {
    business_name: name,
    industry: seed.industry,
    tagline,
    story: about,
    goals: seed.goals,
    pages: seed.pages,
    has_logo: Boolean(brief.logoUrl?.trim()),
    brand_colors: seed.brandColors,
    fonts: '',
    current_website: '',
    facebook_url: '',
    instagram_url: '',
    google_business: '',
    contact_email: brief.email?.trim() || '',
    contact_phone: brief.phone?.trim() || '',
    address,
    hours: seed.hours,
    tone: seed.tone,
    content_ownership: 'We own or have rights to everything we will provide',
    donation_url: '',
    booking_url: '',
  };
}

/** Confirmed source_content payload so deterministic generation gets real services. */
export function buildDemoSourceData(brief: DemoBrief, seed: DemoIndustrySeed) {
  return {
    businessName: brief.businessName.trim(),
    about: brief.blurb?.trim() || seed.defaultAbout,
    description: brief.blurb?.trim() || seed.defaultAbout,
    hours: seed.hours,
    headings: seed.services.map((s) => s.name),
    services: seed.services,
    servicesTitle: seed.servicesTitle,
    highlights: seed.highlights,
    ctaLabel: seed.ctaLabel,
    palette: seed.brandColors.split(/\s+/).filter(Boolean),
    demo: true,
    recipeId: seed.recipeId,
  };
}
