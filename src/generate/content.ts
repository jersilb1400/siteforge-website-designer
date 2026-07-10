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
  return '#contact';
}

function servicesTitleFor(industry: string, override?: string): string {
  if (override) return override;
  if (industry === 'Restaurant / Cafe') return 'What we offer';
  if (industry === 'Church / Ministry') return 'Our ministries';
  if (industry === 'Day spa / Salon') return 'Rituals & services';
  return 'What we do';
}

// --- deterministic fallback -------------------------------------------------
function deterministic(inputs: ContentInputs): GeneratedContent {
  const { profile, confirmed } = inputs;
  const name = profile.business.name || 'Our business';
  const cta = goalToCta(profile.goals, confirmed.ctaLabel);
  const story = profile.business.story || confirmed.about || confirmed.description || '';
  const firstSentence = story.split(/(?<=[.!?])\s/)[0] || `Welcome to ${name}.`;

  const aboutBody = [story || `${name} is proud to serve our community.`];
  if (confirmed.description && confirmed.description !== story) aboutBody.push(confirmed.description);

  // Prefer rich seeded services (demos), then scraped headings, then goals.
  let services: Array<{ name: string; desc: string }>;
  if (confirmed.services?.length) {
    services = confirmed.services.slice(0, 6);
  } else {
    const headingItems = (confirmed.headings ?? [])
      .filter((h) => h.length > 2 && h.length < 60)
      .slice(0, 4)
      .map((h) => ({ name: h, desc: `Learn more about ${h.toLowerCase()} at ${name}.` }));
    services = headingItems.length
      ? headingItems
      : profile.goals.slice(0, 4).map((g) => ({ name: g.replace(/\s*\(.*\)/, ''), desc: `How ${name} can help.` }));
  }

  // Sales demos and spa sites lead with the brand name (hero-level signal).
  const brandFirst = confirmed.demo || profile.business.industry === 'Day spa / Salon';
  const heroHeadline = brandFirst ? name : profile.business.tagline || firstSentence;
  const heroSub = brandFirst
    ? profile.business.tagline || firstSentence
    : profile.business.tagline
      ? firstSentence
      : `${name} — ${profile.business.industry || 'here for you'}.`;

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
    ctaTitle: `Ready to connect with ${name}?`,
    ctaBody: profile.contact.address
      ? `Visit us at ${profile.contact.address} or reach out any time.`
      : 'Reach out and we will get right back to you.',
  };
}

// --- Claude path ------------------------------------------------------------
export async function generateContent(env: Env, inputs: ContentInputs): Promise<GeneratedContent> {
  const fallback = deterministic(inputs);
  if (!env.ANTHROPIC_API_KEY) return fallback;

  const { profile, confirmed } = inputs;
  const cta = goalToCta(profile.goals, confirmed.ctaLabel);
  try {
    const client = anthropicFrom(env.ANTHROPIC_API_KEY);
    const { smart } = models(env);
    const serviceHint = confirmed.services?.length
      ? `Preferred service names (keep these, refine descriptions): ${confirmed.services.map((s) => s.name).join(', ')}\n`
      : '';
    const brandHint = confirmed.demo || profile.business.industry === 'Day spa / Salon'
      ? `heroHeadline MUST be exactly the business name "${profile.business.name}". Put the tagline or a short benefit line in heroSub.\n`
      : '';
    const out = await client.completeJSON<GeneratedContent>({
      model: smart,
      maxTokens: 1500,
      temperature: 0.7,
      system:
        'You are a senior website copywriter. Write concise, specific, benefit-led copy in the requested tone. ' +
        'Never use placeholder or lorem-ipsum text. Ground everything in the facts provided. ' +
        'Return JSON matching the requested schema exactly.',
      messages: [
        {
          role: 'user',
          content:
            `Business: ${profile.business.name} (${profile.business.industry}). Tone: ${profile.tone}.\n` +
            `Tagline: ${profile.business.tagline || '(none — you may write one)'}\n` +
            `Story: ${profile.business.story}\n` +
            `Confirmed about text: ${confirmed.about ?? ''}\n` +
            `Confirmed description: ${confirmed.description ?? ''}\n` +
            serviceHint +
            brandHint +
            `Goals: ${profile.goals.join(', ')}\n` +
            `Primary CTA: ${cta.label}\n\n` +
            `Write site copy as JSON with keys: heroHeadline (<=8 words), heroSub (<=20 words), ` +
            `aboutTitle, aboutBody (array of 1-2 short paragraphs), servicesTitle, ` +
            `services (array of 3-5 {name, desc<=18 words}), highlights (array of up to 3 short phrases), ` +
            `ctaTitle, ctaBody (<=25 words).`,
        },
      ],
    });
    // Merge over fallback so any missing field is still populated + CTA wiring is preserved.
    const merged: GeneratedContent = {
      ...fallback,
      ...out,
      heroCtaLabel: cta.label,
      heroCtaHref: ctaHref(cta.kind, profile),
      aboutBody: Array.isArray(out.aboutBody) && out.aboutBody.length ? out.aboutBody : fallback.aboutBody,
      services: Array.isArray(out.services) && out.services.length ? out.services : fallback.services,
      highlights: Array.isArray(out.highlights) && out.highlights.length ? out.highlights : fallback.highlights,
    };
    // Enforce brand-first hero for demos / spa even if the model drifts.
    if (confirmed.demo || profile.business.industry === 'Day spa / Salon') {
      merged.heroHeadline = profile.business.name;
      if (!merged.heroSub) merged.heroSub = profile.business.tagline || fallback.heroSub;
    }
    return merged;
  } catch {
    return fallback;
  }
}
