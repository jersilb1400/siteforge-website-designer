// Curated, royalty-free Unsplash photos for sales demos.
// Demos must look real — text-only previews fail the pitch. These are fetched
// into R2 and auto-confirmed so generateBuild can bake them into the bundle.
// Prefer Unsplash CDN direct links (stable, no API key).

export interface DemoPhoto {
  url: string;
  alt: string;
}

const SPA: DemoPhoto[] = [
  {
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1800&q=80',
    alt: 'Calm spa treatment room with soft lighting',
  },
  {
    url: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1400&q=80',
    alt: 'Hot stone massage arranged on linen',
  },
  {
    url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=80',
    alt: 'Salon styling station with mirrors',
  },
  {
    url: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1400&q=80',
    alt: 'Facial skincare products and soft towels',
  },
  {
    url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1400&q=80',
    alt: 'Manicure and nail care detail',
  },
  {
    url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1400&q=80',
    alt: 'Spa reception with natural materials',
  },
];

const WELLNESS: DemoPhoto[] = [
  {
    url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1800&q=80',
    alt: 'Bright wellness studio space',
  },
  {
    url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1400&q=80',
    alt: 'Care consultation in a calm clinic',
  },
  {
    url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1400&q=80',
    alt: 'Yoga and movement practice',
  },
  {
    url: 'https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1400&q=80',
    alt: 'Herbal tea and wellness ritual',
  },
  {
    url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1400&q=80',
    alt: 'Meditation and quiet recovery',
  },
];

const RESTAURANT: DemoPhoto[] = [
  {
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=80',
    alt: 'Warm restaurant dining room',
  },
  {
    url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=80',
    alt: 'Plated seasonal dish',
  },
  {
    url: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80',
    alt: 'Chef plating in the kitchen',
  },
  {
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80',
    alt: 'Bar and evening atmosphere',
  },
  {
    url: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1400&q=80',
    alt: 'Fresh ingredients on a prep table',
  },
];

const CHURCH: DemoPhoto[] = [
  {
    url: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1800&q=80',
    alt: 'Sunlit church sanctuary',
  },
  {
    url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=1400&q=80',
    alt: 'Congregation gathered in worship',
  },
  {
    url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1400&q=80',
    alt: 'Church exterior and entrance',
  },
  {
    url: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?auto=format&fit=crop&w=1400&q=80',
    alt: 'Community fellowship moment',
  },
];

const PROFESSIONAL: DemoPhoto[] = [
  {
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80',
    alt: 'Modern professional office',
  },
  {
    url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=80',
    alt: 'Team collaboration meeting',
  },
  {
    url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80',
    alt: 'Desk with documents and laptop',
  },
  {
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1400&q=80',
    alt: 'Professional portrait in office',
  },
];

const TRADE: DemoPhoto[] = [
  {
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1800&q=80',
    alt: 'Tradesperson at work on site',
  },
  {
    url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1400&q=80',
    alt: 'Tools laid out for a job',
  },
  {
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1400&q=80',
    alt: 'Home renovation in progress',
  },
  {
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1400&q=80',
    alt: 'Finished craftsmanship detail',
  },
];

const RETAIL: DemoPhoto[] = [
  {
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80',
    alt: 'Boutique retail interior',
  },
  {
    url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=80',
    alt: 'Product display shelves',
  },
  {
    url: 'https://images.unsplash.com/photo-1555529902-5261145633bf?auto=format&fit=crop&w=1400&q=80',
    alt: 'Storefront window display',
  },
  {
    url: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?auto=format&fit=crop&w=1400&q=80',
    alt: 'Curated goods on a table',
  },
];

const NONPROFIT: DemoPhoto[] = [
  {
    url: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1800&q=80',
    alt: 'Volunteers serving the community',
  },
  {
    url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1400&q=80',
    alt: 'Hands joined in partnership',
  },
  {
    url: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=1400&q=80',
    alt: 'Community event outdoors',
  },
  {
    url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1400&q=80',
    alt: 'Donation and outreach moment',
  },
];

const PORTFOLIO: DemoPhoto[] = [
  {
    url: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1800&q=80',
    alt: 'Creative studio workspace',
  },
  {
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80',
    alt: 'Design work on screen',
  },
  {
    url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=1400&q=80',
    alt: 'Sketchbook and creative tools',
  },
  {
    url: 'https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&w=1400&q=80',
    alt: 'Portfolio print layout',
  },
];

const BY_INDUSTRY: Record<string, DemoPhoto[]> = {
  'Day spa / Salon': SPA,
  'Health & wellness': WELLNESS,
  'Restaurant / Cafe': RESTAURANT,
  'Church / Ministry': CHURCH,
  'Professional services (law, accounting, consulting)': PROFESSIONAL,
  'Home & trade services': TRADE,
  'Retail / shop': RETAIL,
  Nonprofit: NONPROFIT,
  'Personal brand / portfolio': PORTFOLIO,
  Other: PROFESSIONAL,
};

export function photosForIndustry(industry: string): DemoPhoto[] {
  return BY_INDUSTRY[industry] ?? PROFESSIONAL;
}
