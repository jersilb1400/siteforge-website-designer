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
  // Merged, confirmed source_content fields (about text, description, etc).
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
  };
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
  // Drop trailing social-proof crumbs scraped from Facebook about boxes.
  s = s.replace(/\d+\s+likes?\b.*$/i, '').trim();
  s = s.replace(/\d+\s+talking about this.*$/i, '').trim();
  // Collapse repeated separators left behind.
  s = s.replace(/(?:\s*·\s*){2,}/g, ' · ').replace(/^·\s*|\s*·$/g, '').trim();
  return s;
}

/** Hours scraped from Google often arrive as a weekday dump — keep it readable. */
export function cleanHours(raw: string | undefined | null): string {
  if (!raw) return '';
  let s = cleanCopy(raw);
  // Insert separators between "Day HH:MM" runs when missing.
  s = s.replace(/([ap]m)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/gi, '$1 · $2');
  s = s.replace(/([ap]m)\s+(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi, '$1 · $2');
  return s;
}

const GOAL_LIKE =
  /^(generate leads|take bookings|share information|collect donations|sell a few|grow an email|promote events)/i;

function goalToCta(goals: string[], confirmedCta?: string): { label: string; kind: string } {
  if (confirmedCta) {
    const kind = /book|appoint/i.test(confirmedCta)
      ? 'booking'
      : /donat|give/i.test(confirmedCta)
        ? 'donation'
        : /shop|buy/i.test(confirmedCta)
          ? 'services'
          : 'contact';
    return { label: confirmedCta, kind };
  }
  if (goals.includes('Take bookings or appointments')) return { label: 'Book an appointment', kind: 'booking' };
  if (goals.includes('Collect donations')) return { label: 'Give', kind: 'donation' };
  if (goals.includes('Generate leads / inquiries')) return { label: 'Get in touch', kind: 'contact' };
  if (goals.includes('Sell a few products (e-commerce-lite)')) return { label: 'Shop now', kind: 'services' };
  return { label: 'Contact us', kind: 'contact' };
}

function ctaHref(kind: string, profile: SiteProfile): string {
  if (kind === 'booking' && profile.content.bookingUrl) return profile.content.bookingUrl;
  if (kind === 'donation' && profile.content.donationUrl) return profile.content.donationUrl;
  // Multi-page sites: contact lives on its own file (Book/Visit labels still map here).
  return 'contact.html';
}

function servicesTitleFor(industry: string, override?: string): string {
  if (override) return override;
  if (industry === 'Restaurant / Cafe') return 'What we offer';
  if (industry === 'Church / Ministry') return 'Our ministries';
  if (industry === 'Day spa / Salon') return 'Rituals & services';
  if (industry === 'Health & wellness') return 'Care offerings';
  return 'What we do';
}

function ctaTitleFor(industry: string, name: string): string {
  if (industry === 'Day spa / Salon' || industry === 'Health & wellness') return `Reserve your time at ${name}`;
  return `Ready to connect with ${name}?`;
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
  return [
    { name: 'Core services', desc: `How ${name} helps clients every week.` },
    { name: 'Consultations', desc: 'A clear first conversation about your goals.' },
    { name: 'Ongoing support', desc: 'Follow-through after the first engagement.' },
  ];
}

// --- deterministic fallback -------------------------------------------------
function deterministic(inputs: ContentInputs): GeneratedContent {
  const { profile, confirmed } = inputs;
  const name = profile.business.name || 'Our business';
  const cta = goalToCta(profile.goals, confirmed.ctaLabel);
  const tagline = cleanCopy(profile.business.tagline);
  const story = cleanCopy(profile.business.story || confirmed.about || confirmed.description || '');
  const firstSentence = story.split(/(?<=[.!?])\s/)[0] || `Welcome to ${name}.`;
  const aboutExtra = cleanCopy(confirmed.description);

  const aboutBody = [story || `${name} is proud to serve our community.`];
  if (aboutExtra && aboutExtra !== story && !GOAL_LIKE.test(aboutExtra)) aboutBody.push(aboutExtra);

  // Prefer rich seeded services (demos), then non-goal headings, then industry defaults.
  // NEVER use interview goals as service names — that produced "Generate leads / inquiries".
  let services: Array<{ name: string; desc: string }>;
  if (confirmed.services?.length) {
    services = confirmed.services.slice(0, 6);
  } else {
    const headingItems = (confirmed.headings ?? [])
      .map((h) => cleanCopy(h))
      .filter((h) => h.length > 2 && h.length < 60 && !GOAL_LIKE.test(h))
      .slice(0, 4)
      .map((h) => ({ name: h, desc: `Learn more about ${h.toLowerCase()} at ${name}.` }));
    services = headingItems.length ? headingItems : industryDefaultServices(profile.business.industry, name);
  }

  // Sales demos and spa sites lead with the brand name (hero-level signal).
  const brandFirst = confirmed.demo || profile.business.industry === 'Day spa / Salon';
  const heroHeadline = brandFirst ? name : tagline || firstSentence;
  // Tagline already surfaces as the eyebrow when brand-first — don't repeat it.
  const heroSub = brandFirst
    ? firstSentence
    : tagline
      ? firstSentence
      : `${name} — ${profile.business.industry || 'here for you'}.`;

  const hours = cleanHours(profile.contact.hours || confirmed.hours);
  const address = cleanCopy(profile.contact.address);

  return {
    heroHeadline,
    heroSub,
    heroCtaLabel: cta.label,
    heroCtaHref: ctaHref(cta.kind, profile),
    aboutTitle: `About ${name}`,
    aboutBody,
    servicesTitle: servicesTitleFor(profile.business.industry, confirmed.servicesTitle),
    services,
    highlights: confirmed.highlights?.length ? confirmed.highlights : [],
    ctaTitle: ctaTitleFor(profile.business.industry, name),
    ctaBody: address
      ? `Visit us at ${address} or reach out any time.`
      : 'Reach out and we will get right back to you.',
  };
}

// --- Claude path ------------------------------------------------------------
export async function generateContent(env: Env, inputs: ContentInputs): Promise<GeneratedContent> {
  const fallback = deterministic(inputs);
  if (!env.ANTHROPIC_API_KEY) return fallback;

  const { profile, confirmed } = inputs;
  const cta = goalToCta(profile.goals, confirmed.ctaLabel);
  const tagline = cleanCopy(profile.business.tagline);
  const story = cleanCopy(profile.business.story);
  try {
    const client = anthropicFrom(env.ANTHROPIC_API_KEY);
    const { smart } = models(env);
    const serviceHint = confirmed.services?.length
      ? `Preferred service names (keep these, refine descriptions): ${confirmed.services.map((s) => s.name).join(', ')}\n`
      : 'Do NOT invent services named after website goals (no "Generate leads", "Take bookings", etc.). Use real offerings.\n';
    const brandHint = confirmed.demo || profile.business.industry === 'Day spa / Salon'
      ? `heroHeadline MUST be exactly the business name "${profile.business.name}". Put a short benefit line in heroSub (not the raw tagline if it has pipes or junk).\n`
      : '';
    const out = await client.completeJSON<GeneratedContent>({
      model: smart,
      maxTokens: 1500,
      temperature: 0.7,
      system:
        'You are a senior website copywriter. Write concise, specific, benefit-led copy in the requested tone. ' +
        'Never use placeholder or lorem-ipsum text. Never use interview goals as service names. ' +
        'Clean up scraped taglines (remove pipes, Facebook like-counts). Ground everything in the facts provided. ' +
        'Return JSON matching the requested schema exactly.',
      messages: [
        {
          role: 'user',
          content:
            `Business: ${profile.business.name} (${profile.business.industry}). Tone: ${profile.tone}.\n` +
            `Tagline: ${tagline || '(none — you may write one)'}\n` +
            `Story: ${story}\n` +
            `Confirmed about text: ${cleanCopy(confirmed.about)}\n` +
            `Confirmed description: ${cleanCopy(confirmed.description)}\n` +
            serviceHint +
            brandHint +
            `Goals (for CTA only, NOT service names): ${profile.goals.join(', ')}\n` +
            `Primary CTA: ${cta.label}\n\n` +
            `Write site copy as JSON with keys: heroHeadline (<=8 words), heroSub (<=20 words), ` +
            `aboutTitle, aboutBody (array of 1-2 short paragraphs), servicesTitle, ` +
            `services (array of 3-5 {name, desc<=18 words}), highlights (array of up to 3 short phrases), ` +
            `ctaTitle, ctaBody (<=25 words).`,
        },
      ],
    });
    const merged: GeneratedContent = {
      ...fallback,
      ...out,
      heroCtaLabel: cta.label,
      heroCtaHref: ctaHref(cta.kind, profile),
      aboutBody: Array.isArray(out.aboutBody) && out.aboutBody.length ? out.aboutBody.map(cleanCopy) : fallback.aboutBody,
      services:
        Array.isArray(out.services) && out.services.length && !out.services.some((s) => GOAL_LIKE.test(s.name))
          ? out.services
          : fallback.services,
      highlights: Array.isArray(out.highlights) && out.highlights.length ? out.highlights : fallback.highlights,
      heroHeadline: cleanCopy(out.heroHeadline) || fallback.heroHeadline,
      heroSub: cleanCopy(out.heroSub) || fallback.heroSub,
    };
    if (confirmed.demo || profile.business.industry === 'Day spa / Salon') {
      merged.heroHeadline = profile.business.name;
      if (!merged.heroSub || merged.heroSub === tagline) merged.heroSub = fallback.heroSub;
    }
    return merged;
  } catch {
    return fallback;
  }
}
