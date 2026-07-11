// The SiteForge interview question bank.
//
// The interview is adaptive but deterministic at its core: an ordered bank of
// questions, each of which can `skipIf` prior answers make it irrelevant, plus
// dynamic hooks (industry-aware page suggestions, thin-answer follow-ups) layered
// on top by the engine. Keeping the backbone declarative makes the flow testable
// and resumable — the engine just walks the bank against stored answers.

export type Phase =
  | 'basics'
  | 'goals'
  | 'pages'
  | 'brand'
  | 'presence'
  | 'contact'
  | 'tone'
  | 'content';

export type QuestionType =
  | 'text'
  | 'longtext'
  | 'single_select'
  | 'multi_select'
  | 'url'
  | 'url_list'
  | 'boolean';

// Parsed answer values keyed by question id. Values are already JSON.parsed.
export type Answers = Record<string, unknown>;

export interface Question {
  id: string;
  phase: Phase;
  text: string;
  help?: string;
  type: QuestionType;
  options?: string[];
  // When set, the engine fills `options` at runtime (e.g. industry page ideas).
  optionsFrom?: 'industry_pages';
  placeholder?: string;
  required: boolean;
  // Return true to skip this question given prior answers.
  skipIf?: (a: Answers) => boolean;
}

export const PHASE_ORDER: Phase[] = [
  'basics',
  'goals',
  'pages',
  'brand',
  'presence',
  'contact',
  'tone',
  'content',
];

const str = (a: Answers, id: string): string =>
  typeof a[id] === 'string' ? (a[id] as string) : '';
const list = (a: Answers, id: string): string[] =>
  Array.isArray(a[id]) ? (a[id] as string[]) : [];

export const QUESTIONS: Question[] = [
  // --- basics ---
  {
    id: 'business_name',
    phase: 'basics',
    text: 'What is the name of your business, church, or brand?',
    type: 'text',
    placeholder: 'e.g. Grace Fellowship, Rivertown Roasters',
    required: true,
  },
  {
    id: 'industry',
    phase: 'basics',
    text: 'What kind of organization is it?',
    help: 'This tailors page suggestions and tone. Pick the closest fit.',
    type: 'single_select',
    options: [
      'Church / Ministry',
      'Restaurant / Cafe',
      'Professional services (law, accounting, consulting)',
      'Health & wellness',
      'Day spa / Salon',
      'Home & trade services',
      'Retail / shop',
      'Nonprofit',
      'Personal brand / portfolio',
      'Other',
    ],
    required: true,
  },
  {
    id: 'tagline',
    phase: 'basics',
    text: 'Do you have a tagline or short slogan?',
    help: 'One line that captures what you do. Leave blank and SiteForge can draft one.',
    type: 'text',
    placeholder: 'e.g. Real coffee, real neighbors',
    required: false,
  },
  {
    id: 'story',
    phase: 'basics',
    text: 'Tell the story of your organization in a paragraph.',
    help: 'Who you serve, what makes you different, why you started. This grounds all generated copy.',
    type: 'longtext',
    required: true,
  },

  // --- goals ---
  {
    id: 'goals',
    phase: 'goals',
    text: 'What should this website do for you?',
    help: 'Pick every goal that matters.',
    type: 'multi_select',
    options: [
      'Generate leads / inquiries',
      'Take bookings or appointments',
      'Share information & build trust',
      'Collect donations',
      'Sell a few products (e-commerce-lite)',
      'Grow an email list',
      'Promote events',
    ],
    required: true,
  },

  // --- pages ---
  {
    id: 'pages',
    phase: 'pages',
    text: 'Which pages should the site include?',
    help: 'We suggested defaults for your industry — add or remove as you like.',
    type: 'multi_select',
    optionsFrom: 'industry_pages',
    required: true,
  },

  // --- brand ---
  {
    id: 'has_logo',
    phase: 'brand',
    text: 'Do you have a logo?',
    type: 'boolean',
    required: true,
  },
  {
    id: 'brand_colors',
    phase: 'brand',
    text: 'What are your brand colors?',
    help: 'List hex codes or describe them (e.g. "forest green and gold"). Or choose to have a palette generated.',
    type: 'text',
    placeholder: 'e.g. #47704C, gold accent — or "generate a palette for me"',
    required: false,
  },
  {
    id: 'fonts',
    phase: 'brand',
    text: 'Any font preferences?',
    help: 'Optional. SiteForge pairs a distinctive display face with a readable body face if you leave this blank.',
    type: 'text',
    required: false,
  },

  // --- presence ---
  {
    id: 'current_website',
    phase: 'presence',
    text: 'Do you have a current website? Paste the URL.',
    help: 'SiteForge can pull your existing content, images, and colors for you to review.',
    type: 'url',
    required: false,
  },
  {
    id: 'facebook_url',
    phase: 'presence',
    text: 'Facebook page URL?',
    type: 'url',
    required: false,
  },
  {
    id: 'instagram_url',
    phase: 'presence',
    text: 'Instagram profile URL?',
    type: 'url',
    required: false,
  },
  {
    id: 'google_business',
    phase: 'presence',
    text: 'Google Business Profile — paste the URL or your listing name.',
    help: 'Used to pull hours, reviews, and photos where permitted.',
    type: 'text',
    required: false,
  },

  // --- contact ---
  {
    id: 'contact_email',
    phase: 'contact',
    text: 'Best contact email to show on the site?',
    type: 'text',
    required: true,
  },
  {
    id: 'contact_phone',
    phase: 'contact',
    text: 'Contact phone number?',
    type: 'text',
    required: false,
  },
  {
    id: 'address',
    phase: 'contact',
    text: 'Physical address or service area?',
    help: 'Skip if you prefer not to show a location.',
    type: 'text',
    required: false,
  },
  {
    id: 'hours',
    phase: 'contact',
    text: 'What are your hours?',
    help: 'Only shown if relevant. Free text is fine.',
    type: 'longtext',
    required: false,
    skipIf: (a) => {
      const g = list(a, 'goals');
      // Ask about hours for places people visit; skip for pure personal brands.
      return str(a, 'industry') === 'Personal brand / portfolio' && g.length === 0;
    },
  },

  // --- tone ---
  {
    id: 'tone',
    phase: 'tone',
    text: 'What tone should the site strike?',
    type: 'single_select',
    options: ['Professional', 'Warm', 'Bold', 'Minimal'],
    required: true,
  },

  // --- content ---
  {
    id: 'content_ownership',
    phase: 'content',
    text: 'How much of the written content do you already have?',
    help: 'This tells SiteForge how much copy to write for you.',
    type: 'single_select',
    options: [
      'I have most of my copy ready',
      'I have some, need help with the rest',
      'Write it all for me from what I told you',
    ],
    required: true,
  },
  {
    id: 'donation_url',
    phase: 'content',
    text: 'Where should the "Donate" button link?',
    help: 'Your existing giving/donation page URL.',
    type: 'url',
    required: false,
    // Only relevant if donations were chosen as a goal.
    skipIf: (a) => !list(a, 'goals').includes('Collect donations'),
  },
  {
    id: 'booking_url',
    phase: 'content',
    text: 'Where should the "Book" button link?',
    help: 'Your scheduling/booking tool URL (Calendly, Square, etc.).',
    type: 'url',
    required: false,
    skipIf: (a) => !list(a, 'goals').includes('Take bookings or appointments'),
  },
];

// Industry -> sensible default page set. The engine offers these as the
// starting selection for the `pages` question; Claude can refine them further.
export const INDUSTRY_PAGE_DEFAULTS: Record<string, string[]> = {
  'Church / Ministry': ['Home', 'About', 'Beliefs', 'Ministries', 'Events', 'Give', 'Visit', 'Contact'],
  'Restaurant / Cafe': ['Home', 'Menu', 'About', 'Gallery', 'Location & Hours', 'Contact'],
  'Professional services (law, accounting, consulting)': ['Home', 'Services', 'About', 'Team', 'Testimonials', 'Contact'],
  'Health & wellness': ['Home', 'Services', 'About', 'Book', 'Testimonials', 'Contact'],
  'Day spa / Salon': ['Home', 'Services', 'About', 'Book', 'Gallery', 'Testimonials', 'Contact'],
  'Home & trade services': ['Home', 'Services', 'Service Area', 'Gallery', 'Reviews', 'Get a Quote', 'Contact'],
  'Retail / shop': ['Home', 'Shop', 'About', 'Gallery', 'Location & Hours', 'Contact'],
  Nonprofit: ['Home', 'Our Mission', 'Programs', 'Impact', 'Get Involved', 'Donate', 'Contact'],
  'Personal brand / portfolio': ['Home', 'About', 'Work', 'Services', 'Contact'],
  Other: ['Home', 'About', 'Services', 'Contact'],
};

export const DEFAULT_PAGES = ['Home', 'About', 'Services', 'Contact'];

export function pagesForIndustry(industry: string | undefined): string[] {
  if (!industry) return DEFAULT_PAGES;
  return INDUSTRY_PAGE_DEFAULTS[industry] ?? DEFAULT_PAGES;
}

export function questionById(qid: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === qid);
}
