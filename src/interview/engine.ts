import type { Env } from '../types';
import { anthropicFrom } from '../lib/anthropic';
import { models } from '../lib/config';
import {
  QUESTIONS,
  type Answers,
  type Question,
  pagesForIndustry,
} from './questions';

// The interview engine. Pure functions where possible so the flow is testable
// without a network; Claude is used only to *enrich* (suggest pages, generate a
// follow-up, draft a palette), never as the source of truth for progression.

/** Decode stored answer rows into a parsed { questionId: value } map. */
export function parseAnswers(
  rows: Array<{ question_id: string; value_json: string }>,
): Answers {
  const out: Answers = {};
  for (const r of rows) {
    try {
      out[r.question_id] = JSON.parse(r.value_json);
    } catch {
      out[r.question_id] = r.value_json;
    }
  }
  return out;
}

function isAnswered(a: Answers, q: Question): boolean {
  const v = a[q.id];
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0 || !q.required;
  if (Array.isArray(v)) return v.length > 0 || !q.required;
  return true; // booleans, objects
}

/**
 * The next question to ask, or null when the interview is complete.
 * Skips questions whose `skipIf` matches. Every presented question gets an
 * answer row (optional ones may be stored empty), so `isAnswered` advancing to
 * true is what moves the flow forward — the client can never loop on an
 * optional question they chose to skip.
 */
export function nextQuestion(a: Answers): Question | null {
  for (const q of QUESTIONS) {
    if (q.skipIf?.(a)) continue;
    if (isAnswered(a, q)) continue;
    return q;
  }
  return null;
}

/** Progress as answered visible questions / total visible questions. */
export function progress(a: Answers): { answered: number; total: number } {
  const visible = QUESTIONS.filter((q) => !q.skipIf?.(a));
  const done = visible.filter((q) => isAnswered(a, q));
  return { answered: done.length, total: visible.length };
}

/**
 * The non-network parts of interview state: whether we're done, whether Back
 * has anywhere to go, and whether the upcoming question is the last one (so
 * the client can label its primary button "Finish" rather than "Continue").
 * Kept pure/DB-free so it's directly unit-testable; routes layer the async
 * `presentQuestion` (dynamic options) on top of `question`.
 */
export interface InterviewState {
  status: string;
  progress: { answered: number; total: number };
  complete: boolean;
  canGoBack: boolean;
  isLast: boolean;
  question: Question | null;
}

export function computeInterviewState(a: Answers, sessionStatus: string): InterviewState {
  const q = nextQuestion(a);
  const p = progress(a);
  return {
    status: q ? sessionStatus : 'complete',
    progress: p,
    complete: q === null,
    // Any stored answer row means there's somewhere for Back to go; on the
    // first question (no answers yet) it stays disabled/hidden client-side.
    canGoBack: Object.keys(a).length > 0,
    isLast: q !== null && p.answered >= p.total - 1,
    question: q,
  };
}

/**
 * Resolve dynamic options for a question (currently: industry page ideas).
 * Uses the cheap model to tailor the default list to the specific business,
 * falling back to the static industry defaults on any error.
 */
export async function resolveOptions(
  env: Env,
  q: Question,
  a: Answers,
): Promise<string[] | undefined> {
  if (q.optionsFrom !== 'industry_pages') return q.options;

  const industry = typeof a['industry'] === 'string' ? (a['industry'] as string) : undefined;
  const fallback = pagesForIndustry(industry);

  if (!env.ANTHROPIC_API_KEY) return fallback;

  try {
    const client = anthropicFrom(env.ANTHROPIC_API_KEY);
    const { cheap } = models(env);
    const result = await client.completeJSON<{ pages: string[] }>({
      model: cheap,
      maxTokens: 300,
      temperature: 0.4,
      system:
        'You suggest website page lists for small-business sites. Return concise, conventional page names a visitor would recognize.',
      messages: [
        {
          role: 'user',
          content:
            `Business name: ${a['business_name'] ?? '(unknown)'}\n` +
            `Industry: ${industry ?? '(unknown)'}\n` +
            `Story: ${String(a['story'] ?? '').slice(0, 400)}\n\n` +
            `Suggest 5-8 pages for this site as {"pages": ["Home", ...]}. ` +
            `Always include Home and Contact. Prefer these defaults unless the story ` +
            `clearly calls for changes: ${fallback.join(', ')}.`,
        },
      ],
    });
    const pages = Array.isArray(result.pages) ? result.pages.filter((p) => typeof p === 'string') : [];
    return pages.length >= 3 ? pages : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Generate one adaptive follow-up when a free-text answer is too thin to build
 * good copy from. Returns null when no follow-up is warranted or AI is
 * unavailable — the engine simply moves on in that case.
 */
export async function maybeFollowUp(
  env: Env,
  q: Question,
  a: Answers,
): Promise<string | null> {
  // Only bother for the story, and only when it's short.
  if (q.id !== 'story') return null;
  const story = String(a['story'] ?? '').trim();
  if (story.length === 0 || story.length > 200) return null;
  if (!env.ANTHROPIC_API_KEY) return null;

  try {
    const client = anthropicFrom(env.ANTHROPIC_API_KEY);
    const { cheap } = models(env);
    const out = await client.completeJSON<{ followup: string | null }>({
      model: cheap,
      maxTokens: 200,
      temperature: 0.6,
      system:
        'You are a warm, efficient website intake interviewer. Ask at most one short, specific follow-up question to draw out the single most useful missing detail. If the answer is already rich enough, return null.',
      messages: [
        {
          role: 'user',
          content:
            `Business: ${a['business_name'] ?? ''} (${a['industry'] ?? ''}).\n` +
            `They described themselves as: "${story}"\n\n` +
            `Return {"followup": "..."} with one question, or {"followup": null}.`,
        },
      ],
    });
    const f = out.followup;
    return typeof f === 'string' && f.trim().length > 0 ? f.trim() : null;
  } catch {
    return null;
  }
}

// The structured profile — the Phase 1 deliverable. Everything downstream
// (ingestion targets, generation spec) reads from this shape.
export interface SiteProfile {
  business: { name: string; industry: string; tagline: string; story: string };
  goals: string[];
  pages: string[];
  brand: { hasLogo: boolean; colors: string; fonts: string; generatePalette: boolean };
  presence: {
    website: string;
    facebook: string;
    instagram: string;
    googleBusiness: string;
  };
  contact: { email: string; phone: string; address: string; hours: string };
  tone: string;
  content: { ownership: string; donationUrl: string; bookingUrl: string };
}

const s = (a: Answers, k: string): string => (typeof a[k] === 'string' ? (a[k] as string) : '');
const arr = (a: Answers, k: string): string[] => (Array.isArray(a[k]) ? (a[k] as string[]) : []);
const bool = (a: Answers, k: string): boolean => a[k] === true;

/** Assemble the normalized profile from raw answers. */
export function buildProfile(a: Answers): SiteProfile {
  const colors = s(a, 'brand_colors');
  return {
    business: {
      name: s(a, 'business_name'),
      industry: s(a, 'industry'),
      tagline: s(a, 'tagline'),
      story: s(a, 'story'),
    },
    goals: arr(a, 'goals'),
    pages: arr(a, 'pages').length ? arr(a, 'pages') : pagesForIndustry(s(a, 'industry')),
    brand: {
      hasLogo: bool(a, 'has_logo'),
      colors,
      fonts: s(a, 'fonts'),
      generatePalette: /generate|for me|palette/i.test(colors) || colors.trim() === '',
    },
    presence: {
      website: s(a, 'current_website'),
      facebook: s(a, 'facebook_url'),
      instagram: s(a, 'instagram_url'),
      googleBusiness: s(a, 'google_business'),
    },
    contact: {
      email: s(a, 'contact_email'),
      phone: s(a, 'contact_phone'),
      address: s(a, 'address'),
      hours: s(a, 'hours'),
    },
    tone: s(a, 'tone'),
    content: {
      ownership: s(a, 'content_ownership'),
      donationUrl: s(a, 'donation_url'),
      bookingUrl: s(a, 'booking_url'),
    },
  };
}
