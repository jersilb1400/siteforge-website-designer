import type { Env } from '../types';
import { anthropicFrom } from '../lib/anthropic';
import { models } from '../lib/config';
import type { Theme } from './themes/types';

// The "design director" (frontend-design methodology, guardrailed). Instead of
// letting a model emit arbitrary CSS (which breaks layouts + Lighthouse), it
// chooses from CURATED, vetted pools — a font pairing, a signature treatment,
// and a validated brand/accent palette — tailored to the client's brief. The
// output layers on top of a tested theme skeleton, so every client gets a
// distinctive look while accessibility/performance guarantees hold.

export interface FontPairing {
  display: string;
  body: string;
  href: string;
}

// Vetted Google Font pairings (loaded with preconnect + display=swap by render).
export const FONT_PAIRINGS: Record<string, FontPairing> = {
  editorial: {
    display: `'Fraunces', Georgia, serif`,
    body: `'Inter', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap',
  },
  grotesque: {
    display: `'Space Grotesk', system-ui, sans-serif`,
    body: `'Inter', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap',
  },
  humanist: {
    display: `'Newsreader', Georgia, serif`,
    body: `'Inter', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600&family=Inter:wght@400;500;600&display=swap',
  },
  geometric: {
    display: `'Poppins', system-ui, sans-serif`,
    body: `'Inter', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500&display=swap',
  },
  'high-contrast': {
    display: `'Playfair Display', Georgia, serif`,
    body: `'Source Sans 3', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;500;600&display=swap',
  },
  slab: {
    display: `'Roboto Slab', Georgia, serif`,
    body: `'Inter', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@500;700&family=Inter:wght@400;500&display=swap',
  },
  elegant: {
    display: `'Cormorant Garamond', Georgia, serif`,
    body: `'Inter', system-ui, sans-serif`,
    href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500&display=swap',
  },
};

// Safe signature treatments — small, curated CSS snippets scoped to sf- classes.
// Each is the "one memorable thing" for a design; none can break layout/perf.
export const SIGNATURES: Record<string, string> = {
  none: '',
  'accent-rule': `.sf-section-head{position:relative;padding-top:1.1rem}.sf-section-head::before{content:'';position:absolute;top:0;left:0;width:56px;height:3px;background:var(--accent)}`,
  'gradient-hero': `.sf-hero{background:linear-gradient(160deg,color-mix(in srgb,var(--brand) 10%,var(--bg)),var(--bg) 70%)}`,
  'underline-heads': `.sf-section-head h2{background-image:linear-gradient(var(--accent),var(--accent));background-size:100% 3px;background-position:0 100%;background-repeat:no-repeat;padding-bottom:6px}`,
  'framed-cards': `.sf-service{border:1.5px solid var(--ink);box-shadow:4px 4px 0 var(--accent)}`,
  'wide-eyebrow': `.sf-eyebrow{font-size:.9rem;letter-spacing:.24em}`,
  'ticker-nav': `.sf-header{border-bottom:2px solid var(--ink)}.sf-brand{text-transform:uppercase;letter-spacing:.02em}`,
};

export interface DesignResolved {
  fontDisplay: string;
  fontBody: string;
  fontHref: string;
  signatureCss: string;
  brand?: string;
  accent?: string;
  rationale?: string;
}

const HEX = /^#[0-9a-f]{6}$/i;

// Validate + resolve a raw pick into concrete, safe design values.
export function resolveDesign(pick: {
  fontPairing?: string;
  signature?: string;
  brand?: string;
  accent?: string;
  rationale?: string;
}): DesignResolved | null {
  const pairing = pick.fontPairing && FONT_PAIRINGS[pick.fontPairing];
  const signature = pick.signature && pick.signature in SIGNATURES ? SIGNATURES[pick.signature] : undefined;
  if (!pairing) return null; // font pairing is the minimum useful override
  return {
    fontDisplay: pairing.display,
    fontBody: pairing.body,
    fontHref: pairing.href,
    signatureCss: signature ?? '',
    brand: pick.brand && HEX.test(pick.brand) ? pick.brand.toLowerCase() : undefined,
    accent: pick.accent && HEX.test(pick.accent) ? pick.accent.toLowerCase() : undefined,
    rationale: typeof pick.rationale === 'string' ? pick.rationale.slice(0, 200) : undefined,
  };
}

export interface Brief {
  name: string;
  industry: string;
  tone: string;
  story: string;
}

/**
 * Ask Claude to art-direct within the guardrails. Returns null when no API key
 * is set or the pick fails validation — callers then use the theme defaults.
 */
export async function deriveDesign(env: Env, brief: Brief, baseTheme: Theme): Promise<DesignResolved | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  try {
    const client = anthropicFrom(env.ANTHROPIC_API_KEY);
    const { smart } = models(env);
    const pick = await client.completeJSON<{
      fontPairing: string; signature: string; brand: string; accent: string; rationale: string;
    }>({
      model: smart,
      maxTokens: 400,
      temperature: 0.8,
      system:
        'You are an art director giving a small business a distinctive but professional visual identity. ' +
        'Make deliberate, specific choices for THIS brief — avoid generic defaults. Return only the requested JSON.',
      messages: [
        {
          role: 'user',
          content:
            `Business: ${brief.name}\nIndustry: ${brief.industry}\nTone: ${brief.tone}\n` +
            `Story: ${brief.story.slice(0, 500)}\nBase layout theme: ${baseTheme.name} (${baseTheme.id})\n\n` +
            `Choose a visual identity as JSON:\n` +
            `- fontPairing: one of [${Object.keys(FONT_PAIRINGS).join(', ')}]\n` +
            `- signature: one of [${Object.keys(SIGNATURES).join(', ')}] (the single memorable treatment)\n` +
            `- brand: a #hex brand color that suits this business (not a generic default)\n` +
            `- accent: a complementary #hex accent\n` +
            `- rationale: one sentence on why these fit the brief\n` +
            `Return {"fontPairing":"...","signature":"...","brand":"#...","accent":"#...","rationale":"..."}.`,
        },
      ],
    });
    return resolveDesign(pick);
  } catch {
    return null;
  }
}
