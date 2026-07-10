import type { Env } from '../types';
import { anthropicFrom } from '../lib/anthropic';
import { models } from '../lib/config';
import type { SiteProfile } from '../interview/engine';
import type { GeneratedContent } from './spec';

// Produce the site copy. Claude writes it when a key is available; otherwise a
// deterministic builder assembles real copy from the profile + confirmed source
// content. Either way, NO lorem ipsum ever reaches a preview.

export interface ContentInputs {
  profile: SiteProfile;
  confirmed: {
    about?: string;
    description?: string;
    headings?: string[];
    hours?: string;
    services?: Array<{ name: string; desc: string }>;
    servicesTitle?: string;
    highlights?: string[];
    ctaLabel?: string;
    demo?: boolean;
    testimonials?: Array<{ quote: string; attribution: string }>;
    faq?: Array<{ q: string; a: string }>;
    team?: Array<{ name: string; role: string; bio?: string }>;
  };
  /** When true (demos / recipes that allow it), invent plausible social proof. */
  allowInventedSocial?: boolean;
  brandFirst?: boolean;
}

/** Strip Facebook/pipe junk and collapse whitespace for display copy. */
export function cleanCopy(raw: string | undefined | null): string {
  if (!raw) return '';
  let s = String(raw)
    .replace(/\uFFFD/g, '')
    .replace(/[|]+/g, ' · ')
    .replace(/\s*[·•]\s*/g, ' · ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  s = s.replace(/\d+\s+likes?\b.*$/i, '').trim();
  s = s.replace(/\d+\s+talking about this.*$/i, '').trim();
  s = s.replace(/(?:\s*·\s*){2,}/g, ' · ').replace(/^·\s*|\s*·$/g, '').trim();
  return s;
}

export function cleanHours(raw: string | undefined | null): string {
  if (!raw) return '';
  let s = cleanCopy(raw);
  s = s.replace(/([ap]m)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi, '$1 · $2');
  s = s.replace(/([ap]m)\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi, '$1 · $2');
  return s;
}

const GOAL_LIKE =
  /^(generate leads|take bookings|share information|collect donations|sell a few|grow an email|promote events)/i;

const WEAK_CTA = /^(learn more|click here|read more|welcome|get started)$/i;

function goalToCta(
  goals: string[],
  industry: string,
  confirmedCta?: string,
): { label: string; kind: string } {
  if (confirmedCta && !WEAK_CTA.test(confirmedCta) && !GOAL_LIKE.test(confirmedCta)) {
    const kind = /book|appoint|reserv/i.test(confirmedCta)
      ? 'booking'
      : /donat|give/i.test(confirmedCta)
        ? 'donation'
        : /shop|buy|order|menu/i.test(confirmedCta)
          ? 'services'
          : /call|quote|touch|contact|inquire/i.test(confirmedCta)
            ? 'contact'
            : 'contact';
    return { label: confirmedCta, kind };
  }
  if (goals.includes('Take bookings or appointments') || industry === 'Day spa / Salon') {
    return { label: industry === 'Day spa / Salon' ? 'Book your ritual' : 'Book an appointment', kind: 'booking' };
  }
  if (goals.includes('Collect donations') || industry === 'Church / Ministry' || industry === 'Nonprofit') {
    return { label: industry === 'Church / Ministry' ? 'Plan a visit' : 'Give', kind: industry === 'Church / Ministry' ? 'contact' : 'donation' };
  }
  if (industry === 'Restaurant / Cafe') return { label: 'Reserve a table', kind: 'booking' };
  if (industry === 'Home & trade services') return { label: 'Get a free quote', kind: 'contact' };
  if (goals.includes('Generate leads / inquiries')) return { label: 'Request a consult', kind: 'contact' };
  if (goals.includes('Sell a few products (e-commerce-lite)')) return { label: 'Shop the collection', kind: 'services' };
  return { label: 'Get in touch', kind: 'contact' };
}

function ctaHref(kind: string, profile: SiteProfile): string {
  if (kind === 'booking' && profile.content.bookingUrl) return profile.content.bookingUrl;
  if (kind === 'donation' && profile.content.donationUrl) return profile.content.donationUrl;
  return 'contact.html';
}

function servicesTitleFor(industry: string, override?: string): string {
  if (override) return override;
  if (industry === 'Restaurant / Cafe') return 'From the kitchen';
  if (industry === 'Church / Ministry') return 'Our ministries';
  if (industry === 'Day spa / Salon') return 'Rituals & services';
  if (industry === 'Health & wellness') return 'Care offerings';
  if (industry === 'Home & trade services') return 'What we build';
  return 'What we do';
}

function ctaTitleFor(industry: string, name: string, kind: string): string {
  if (kind === 'booking' && (industry === 'Day spa / Salon' || industry === 'Health & wellness')) {
    return `Reserve your time at ${name}`;
  }
  if (industry === 'Church / Ministry') return `You are welcome at ${name}`;
  if (industry === 'Restaurant / Cafe') return `Join us at ${name}`;
  if (industry === 'Home & trade services') return `Ready for honest craftsmanship?`;
  return `Ready to connect with ${name}?`;
}

function secondaryLabel(industry: string): string {
  if (industry === 'Day spa / Salon') return 'Explore rituals';
  if (industry === 'Restaurant / Cafe') return 'See the menu';
  if (industry === 'Church / Ministry') return 'Our story';
  if (industry === 'Home & trade services') return 'See our work';
  return 'Our story';
}

function industryDefaultServices(industry: string, name: string): Array<{ name: string; desc: string }> {
  if (industry === 'Day spa / Salon' || industry === 'Health & wellness') {
    return [
      { name: 'Signature Facial', desc: `Custom cleanse and glow tailored at ${name}.` },
      { name: 'Massage Therapy', desc: 'Unhurried bodywork that releases tension.' },
      { name: 'Hair Color & Cut', desc: 'Precision cuts and dimensional color.' },
      { name: 'Nail Rituals', desc: 'Manicure and pedicure with lasting polish.' },
    ];
  }
  if (industry === 'Restaurant / Cafe') {
    return [
      { name: 'Seasonal plates', desc: 'Market-driven dishes that change with the week.' },
      { name: 'House favorites', desc: 'The plates guests ask for by name.' },
      { name: 'Drinks & dessert', desc: 'Thoughtful pours and a sweet finish.' },
    ];
  }
  if (industry === 'Church / Ministry') {
    return [
      { name: 'Sunday gathering', desc: 'Worship, teaching, and a place to belong.' },
      { name: 'Kids & families', desc: 'Safe, joyful spaces for the next generation.' },
      { name: 'Community care', desc: 'Serving neighbors with practical love.' },
    ];
  }
  if (industry === 'Home & trade services') {
    return [
      { name: 'Estimate & plan', desc: 'Clear scope, honest timeline, no surprises.' },
      { name: 'Skilled install', desc: 'Clean workmanship you can see and feel.' },
      { name: 'Finish & follow-up', desc: 'We leave the site tidy and stand behind the work.' },
    ];
  }
  return [
    { name: 'Core services', desc: `How ${name} helps clients every week.` },
    { name: 'Consultations', desc: 'A clear first conversation about your goals.' },
    { name: 'Ongoing support', desc: 'Follow-through after the first engagement.' },
  ];
}

function inventedTestimonials(industry: string, name: string): Array<{ quote: string; attribution: string }> {
  if (industry === 'Day spa / Salon') {
    return [
      { quote: 'I left feeling restored — not rushed. The room, the light, the care.', attribution: 'Maya R.' },
      { quote: `${name} is my reset button. Booking is easy and every visit feels intentional.`, attribution: 'Jordan L.' },
    ];
  }
  if (industry === 'Restaurant / Cafe') {
    return [
      { quote: 'We come for the food and stay for the feeling. Consistently excellent.', attribution: 'Sam & Priya' },
      { quote: 'A neighborhood table done right — warm service, beautiful plates.', attribution: 'Elena V.' },
    ];
  }
  if (industry === 'Church / Ministry') {
    return [
      { quote: 'We felt known on our first Sunday. That still matters.', attribution: 'The Okonkwo family' },
      { quote: 'Teaching that lands, and people who show up for each other.', attribution: 'Chris T.' },
    ];
  }
  if (industry === 'Home & trade services') {
    return [
      { quote: 'Showed up when they said, cleaned up when they left, and the work looks sharp.', attribution: 'Dana M.' },
      { quote: 'Clear quote, no upsell games. I would hire them again tomorrow.', attribution: 'Luis G.' },
    ];
  }
  return [
    { quote: `Working with ${name} felt clear, kind, and professional from day one.`, attribution: 'A. Client' },
    { quote: 'They listened first, then delivered exactly what we needed.', attribution: 'R. Partner' },
  ];
}

function inventedFaq(industry: string, name: string): Array<{ q: string; a: string }> {
  if (industry === 'Day spa / Salon') {
    return [
      { q: 'How do I book?', a: `Use the book button or call us — we will find a time that fits.` },
      { q: 'What should I bring?', a: 'Just yourself. Arrive a few minutes early so you can settle in.' },
      { q: 'Do you take walk-ins?', a: 'We prioritize appointments so every visit stays unhurried.' },
    ];
  }
  if (industry === 'Church / Ministry') {
    return [
      { q: 'What should I wear?', a: 'Come as you are. You will see a mix of casual and dressed-up.' },
      { q: 'Is there something for kids?', a: 'Yes — age-appropriate spaces with caring leaders.' },
      { q: 'Where do I park?', a: 'Parking is available near the main entrance; greeters can help.' },
    ];
  }
  return [
    { q: `How do I get started with ${name}?`, a: 'Reach out through the contact page — we reply quickly with next steps.' },
    { q: 'What does a first conversation look like?', a: 'We listen to your goals, share how we work, and outline clear options.' },
    { q: 'Where are you located?', a: 'See the contact page for address, hours, and ways to reach us.' },
  ];
}

function inventedTeam(name: string): Array<{ name: string; role: string; bio?: string }> {
  return [
    { name: 'Alex Rivera', role: 'Founder', bio: `Leads ${name} with a focus on craft and care.` },
    { name: 'Sam Chen', role: 'Client lead', bio: 'Makes sure every engagement stays clear and human.' },
  ];
}

function trustLineFor(industry: string): string {
  if (industry === 'Day spa / Salon') return 'Quiet rooms · Skilled hands · Unhurried care';
  if (industry === 'Restaurant / Cafe') return 'Seasonal menus · Warm service · Neighborhood table';
  if (industry === 'Church / Ministry') return 'Everyone welcome · Kids cared for · Real community';
  if (industry === 'Home & trade services') return 'Licensed · Insured · On-time & tidy';
  return 'Clear process · Honest communication · Real results';
}

function voiceHint(industry: string): string {
  switch (industry) {
    case 'Day spa / Salon':
      return 'Voice: calm, sensory, editorial luxury. Short sentences. No hype.';
    case 'Restaurant / Cafe':
      return 'Voice: appetizing, warm, specific about food and atmosphere.';
    case 'Church / Ministry':
      return 'Voice: welcoming, reverent without jargon, invitation-first.';
    case 'Home & trade services':
      return 'Voice: trustworthy, plain-spoken, proof-oriented.';
    case 'Health & wellness':
      return 'Voice: clinical-calm, reassuring, benefit-led.';
    default:
      return 'Voice: confident, specific, human. Avoid corporate fluff.';
  }
}

// --- deterministic fallback -------------------------------------------------
function deterministic(inputs: ContentInputs): GeneratedContent {
  const { profile, confirmed } = inputs;
  const name = profile.business.name || 'Our business';
  const industry = profile.business.industry;
  const cta = goalToCta(profile.goals, industry, confirmed.ctaLabel);
  const tagline = cleanCopy(profile.business.tagline);
  const story = cleanCopy(profile.business.story || confirmed.about || confirmed.description || '');
  const firstSentence = story.split(/(?<=[.!?])\s/)[0] || `${name} is here for you.`;
  const aboutExtra = cleanCopy(confirmed.description);

  const aboutBody = [story || `${name} is proud to serve our community.`];
  if (aboutExtra && aboutExtra !== story && !GOAL_LIKE.test(aboutExtra)) aboutBody.push(aboutExtra);

  let services: Array<{ name: string; desc: string }>;
  if (confirmed.services?.length) {
    services = confirmed.services.slice(0, 6);
  } else {
    const headingItems = (confirmed.headings ?? [])
      .map((h) => cleanCopy(h))
      .filter((h) => h.length > 2 && h.length < 60 && !GOAL_LIKE.test(h))
      .slice(0, 4)
      .map((h) => ({ name: h, desc: `${h} — done with care at ${name}.` }));
    services = headingItems.length ? headingItems : industryDefaultServices(industry, name);
  }

  const brandFirst =
    inputs.brandFirst || confirmed.demo || industry === 'Day spa / Salon' || industry === 'Restaurant / Cafe';
  const heroHeadline = brandFirst ? name : tagline || firstSentence;
  const heroSub = brandFirst
    ? firstSentence.replace(/^Welcome to\s+/i, '')
    : tagline
      ? firstSentence
      : `${name} — ${industry || 'here for you'}.`;

  const allowSocial = inputs.allowInventedSocial && confirmed.demo;
  const testimonials =
    confirmed.testimonials?.length
      ? confirmed.testimonials
      : allowSocial
        ? inventedTestimonials(industry, name)
        : undefined;
  const faq =
    confirmed.faq?.length ? confirmed.faq : allowSocial ? inventedFaq(industry, name) : undefined;
  const team =
    confirmed.team?.length ? confirmed.team : allowSocial ? inventedTeam(name) : undefined;

  const address = cleanCopy(profile.contact.address);

  return {
    heroHeadline,
    heroSub,
    heroCtaLabel: cta.label,
    heroCtaHref: ctaHref(cta.kind, profile),
    ctaKind: cta.kind,
    secondaryCtaLabel: secondaryLabel(industry),
    trustLine: trustLineFor(industry),
    aboutTitle: industry === 'Church / Ministry' ? `Who we are` : `About ${name}`,
    aboutBody,
    servicesTitle: servicesTitleFor(industry, confirmed.servicesTitle),
    services,
    highlights: confirmed.highlights?.length ? confirmed.highlights : [],
    ctaTitle: ctaTitleFor(industry, name, cta.kind),
    ctaBody: address
      ? `Visit us at ${address} or reach out any time.`
      : 'Reach out and we will get right back to you.',
    testimonials,
    faq,
    team,
  };
}

export async function generateContent(env: Env, inputs: ContentInputs): Promise<GeneratedContent> {
  const fallback = deterministic(inputs);
  if (!env.ANTHROPIC_API_KEY) return fallback;

  const { profile, confirmed } = inputs;
  const industry = profile.business.industry;
  const cta = goalToCta(profile.goals, industry, confirmed.ctaLabel);
  const tagline = cleanCopy(profile.business.tagline);
  const story = cleanCopy(profile.business.story);
  const allowSocial = !!(inputs.allowInventedSocial && confirmed.demo);
  try {
    const client = anthropicFrom(env.ANTHROPIC_API_KEY);
    const { smart } = models(env);
    const serviceHint = confirmed.services?.length
      ? `Preferred service names (keep these, refine descriptions): ${confirmed.services.map((s) => s.name).join(', ')}\n`
      : 'Do NOT invent services named after website goals. Use real offerings.\n';
    const brandHint =
      inputs.brandFirst || confirmed.demo || industry === 'Day spa / Salon' || industry === 'Restaurant / Cafe'
        ? `heroHeadline MUST be exactly the business name "${profile.business.name}". Put a short benefit line in heroSub. Never start heroSub with "Welcome to".\n`
        : '';
    const socialHint = allowSocial
      ? `Include testimonials (2 items {quote, attribution}), faq (3 items {q, a}), and optionally team (2 items {name, role, bio}). Invent plausible ones for a demo.\n`
      : `Only include testimonials/faq/team if facts are provided; otherwise omit those keys.\n`;

    const out = await client.completeJSON<GeneratedContent>({
      model: smart,
      maxTokens: 2200,
      temperature: 0.7,
      system:
        'You are a senior website copywriter focused on conversion. Write concise, specific, benefit-led copy. ' +
        'Never use placeholder or lorem-ipsum text. Never use interview goals as service names. ' +
        'Never use weak CTAs like "Learn more" or "Click here". ' +
        'Clean up scraped taglines. Ground everything in the facts provided. ' +
        voiceHint(industry) +
        ' Return JSON matching the requested schema exactly.',
      messages: [
        {
          role: 'user',
          content:
            `Business: ${profile.business.name} (${industry}). Tone: ${profile.tone}.\n` +
            `Tagline: ${tagline || '(none)'}\n` +
            `Story: ${story}\n` +
            `Confirmed about: ${cleanCopy(confirmed.about)}\n` +
            `Confirmed description: ${cleanCopy(confirmed.description)}\n` +
            serviceHint +
            brandHint +
            socialHint +
            `Goals (CTA only): ${profile.goals.join(', ')}\n` +
            `Primary CTA label (use exactly): ${cta.label}\n\n` +
            `Write site copy as JSON with keys: heroHeadline (<=8 words), heroSub (<=20 words), ` +
            `aboutTitle, aboutBody (1-2 short paragraphs), servicesTitle, ` +
            `services (3-5 {name, desc<=18 words}), highlights (up to 3), ` +
            `ctaTitle, ctaBody (<=25 words), trustLine (<=12 words), secondaryCtaLabel (<=4 words), ` +
            `testimonials?, faq?, team?.`,
        },
      ],
    });
    const merged: GeneratedContent = {
      ...fallback,
      ...out,
      heroCtaLabel: cta.label,
      heroCtaHref: ctaHref(cta.kind, profile),
      ctaKind: cta.kind,
      aboutBody: Array.isArray(out.aboutBody) && out.aboutBody.length ? out.aboutBody.map(cleanCopy) : fallback.aboutBody,
      services:
        Array.isArray(out.services) && out.services.length && !out.services.some((s) => GOAL_LIKE.test(s.name))
          ? out.services
          : fallback.services,
      highlights: Array.isArray(out.highlights) && out.highlights.length ? out.highlights : fallback.highlights,
      heroHeadline: cleanCopy(out.heroHeadline) || fallback.heroHeadline,
      heroSub: cleanCopy(out.heroSub)?.replace(/^Welcome to\s+/i, '') || fallback.heroSub,
      secondaryCtaLabel: cleanCopy(out.secondaryCtaLabel) || fallback.secondaryCtaLabel,
      trustLine: cleanCopy(out.trustLine) || fallback.trustLine,
      testimonials:
        Array.isArray(out.testimonials) && out.testimonials.length
          ? out.testimonials
          : fallback.testimonials,
      faq: Array.isArray(out.faq) && out.faq.length ? out.faq : fallback.faq,
      team: Array.isArray(out.team) && out.team.length ? out.team : fallback.team,
    };
    if (inputs.brandFirst || confirmed.demo || industry === 'Day spa / Salon' || industry === 'Restaurant / Cafe') {
      merged.heroHeadline = profile.business.name;
    }
    if (WEAK_CTA.test(merged.heroCtaLabel)) merged.heroCtaLabel = cta.label;
    return merged;
  } catch {
    return fallback;
  }
}
