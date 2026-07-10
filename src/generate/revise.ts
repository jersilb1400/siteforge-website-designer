import type { Env } from '../types';
import { one } from '../lib/db';
import { NotFound, BadRequest } from '../lib/errors';
import { anthropicFrom } from '../lib/anthropic';
import { models } from '../lib/config';
import { readableInk, adjustForContrast, type PaletteTokens } from './palette';
import { themeExists, THEMES } from './themes';
import type { SiteSpec } from './spec';
import { finalizeBuild, type BuildResult } from './bundle';

// Natural-language revision. A deterministic parser handles the common asks
// ("make it darker", "use the bold theme", "change the headline to ...") so the
// loop works with no API key; Claude handles anything the parser can't, when a
// key is present. Either way we regenerate a fresh versioned build from the
// mutated spec — the diff is the new version, and rollback is just re-publishing
// an older one.

function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function toHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function shift(hex: string, toward: '#000000' | '#ffffff', t: number): string {
  const [r, g, b] = rgb(hex);
  const [tr, tg, tb] = rgb(toward);
  return toHex([r + (tr - r) * t, g + (tg - g) * t, b + (tb - b) * t]);
}

const NAMED_COLORS: Record<string, string> = {
  red: '#b3261e', green: '#2e7d32', blue: '#1f4fa8', navy: '#12284b', teal: '#0f766e',
  purple: '#6d28d9', orange: '#c2410c', gold: '#b8860b', pink: '#be185d', black: '#171717',
  gray: '#4b5563', grey: '#4b5563', brown: '#7c4a2d', maroon: '#7c2d3a',
};

// Re-derive dependent tokens after brand/bg change so contrast stays valid.
function reconcile(p: PaletteTokens): PaletteTokens {
  return {
    ...p,
    brandInk: readableInk(p.brand),
    link: adjustForContrast(p.brand, p.bg, 4.5),
    accent: adjustForContrast(p.accent, p.bg, 4.5),
  };
}

export interface RevisionOutcome {
  changed: string[];
  spec: SiteSpec;
}

// Deterministic instruction application. Returns which aspects changed.
export function applyInstruction(specIn: SiteSpec, instruction: string): RevisionOutcome {
  const spec: SiteSpec = structuredClone(specIn);
  const text = instruction.toLowerCase();
  const changed: string[] = [];
  let palette = { ...spec.palette };

  // Theme switches.
  const themeMap: Array<[RegExp, string]> = [
    [/\bminimal|editorial|clean\b/, 'atelier'],
    [/\bbold|punchy|vibrant\b/, 'storefront'],
    [/\bwarm|welcoming|soft\b/, 'sanctuary'],
  ];
  // Match any theme by id (all 7), not just the original three.
  const explicitTheme = THEMES.map((t) => t.id).find((id) => new RegExp(`\\b${id}\\b`).test(text));
  if (explicitTheme && themeExists(explicitTheme)) {
    spec.themeId = explicitTheme; changed.push(`theme=${explicitTheme}`);
  } else {
    for (const [re, id] of themeMap) if (re.test(text)) { spec.themeId = id; changed.push(`theme=${id}`); break; }
  }

  // Darker / lighter.
  if (/\bdarker|deeper\b/.test(text)) { palette.brand = shift(palette.brand, '#000000', 0.25); changed.push('brand darker'); }
  if (/\blighter|brighter\b/.test(text)) { palette.brand = shift(palette.brand, '#ffffff', 0.25); changed.push('brand lighter'); }

  // Explicit hex.
  const hex = /#[0-9a-f]{6}\b/i.exec(instruction)?.[0];
  if (hex) { palette.brand = hex.toLowerCase(); changed.push(`brand=${palette.brand}`); }

  // Named color (only when clearly about color/brand).
  if (!hex && /(color|colour|brand|theme|header|palette)/.test(text)) {
    for (const [name, val] of Object.entries(NAMED_COLORS)) {
      if (new RegExp(`\\b${name}\\b`).test(text)) { palette.brand = val; changed.push(`brand=${name}`); break; }
    }
  }

  // Headline / tagline content edits: `headline to "X"` or `headline to X`.
  const headlineTo = /(?:headline|title)\s+(?:to|should be|:)\s+["“]?([^"”]+?)["”]?$/i.exec(instruction.trim());
  if (headlineTo?.[1]) { spec.content.heroHeadline = headlineTo[1].trim(); changed.push('headline'); }
  const taglineTo = /(?:tagline|subtitle|subhead)\s+(?:to|should be|:)\s+["“]?([^"”]+?)["”]?$/i.exec(instruction.trim());
  if (taglineTo?.[1]) { spec.content.heroSub = taglineTo[1].trim(); changed.push('tagline'); }

  if (changed.some((c) => c.startsWith('brand'))) palette = reconcile(palette);
  spec.palette = palette;
  return { changed, spec };
}

// Optional Claude fallback: patch editable spec fields from free-form instruction.
async function reviseWithClaude(env: Env, spec: SiteSpec, instruction: string): Promise<Partial<{
  brand: string; accent: string; themeId: string; heroHeadline: string; heroSub: string; aboutTitle: string;
}> | null> {
  if (!env.ANTHROPIC_API_KEY) return null;
  try {
    const client = anthropicFrom(env.ANTHROPIC_API_KEY);
    const { smart } = models(env);
    return await client.completeJSON({
      model: smart,
      maxTokens: 400,
      temperature: 0.3,
      system:
        'You translate a website revision request into a small JSON patch. Only include fields the user actually asked to change. ' +
        `Allowed keys: brand (#hex), accent (#hex), themeId (${THEMES.map((t) => t.id).join('|')}), heroHeadline, heroSub, aboutTitle. Omit everything else.`,
      messages: [
        { role: 'user', content: `Current headline: "${spec.content.heroHeadline}". Current theme: ${spec.themeId}. Brand: ${spec.palette.brand}.\n\nRequest: "${instruction}"\n\nReturn the JSON patch.` },
      ],
    });
  } catch {
    return null;
  }
}

export async function reviseBuild(env: Env, projectId: string, instruction: string): Promise<BuildResult & { changed: string[] }> {
  if (!instruction || !instruction.trim()) throw new BadRequest('Provide a revision instruction.');

  // Base the revision on the most recent usable build. Published builds have
  // status 'deployed', so 'ready' alone would make revise impossible after a
  // publish (the normal steady state) — include both, exclude building/failed.
  const latest = await one<{ spec_json: string | null }>(
    env,
    `SELECT spec_json FROM builds WHERE project_id = ? AND status IN ('ready','deployed')
       ORDER BY version DESC LIMIT 1`,
    projectId,
  );
  if (!latest?.spec_json) throw new NotFound('a previous build to revise');
  const baseSpec = JSON.parse(latest.spec_json) as SiteSpec;

  let { changed, spec } = applyInstruction(baseSpec, instruction);

  // If the deterministic parser found nothing, try Claude.
  if (changed.length === 0) {
    const patch = await reviseWithClaude(env, spec, instruction);
    if (patch) {
      if (patch.themeId && themeExists(patch.themeId)) { spec.themeId = patch.themeId; changed.push(`theme=${patch.themeId}`); }
      if (patch.brand && /^#[0-9a-f]{6}$/i.test(patch.brand)) { spec.palette.brand = patch.brand.toLowerCase(); changed.push('brand'); }
      if (patch.accent && /^#[0-9a-f]{6}$/i.test(patch.accent)) { spec.palette.accent = patch.accent.toLowerCase(); changed.push('accent'); }
      if (patch.heroHeadline) { spec.content.heroHeadline = patch.heroHeadline; changed.push('headline'); }
      if (patch.heroSub) { spec.content.heroSub = patch.heroSub; changed.push('tagline'); }
      if (patch.aboutTitle) { spec.content.aboutTitle = patch.aboutTitle; changed.push('aboutTitle'); }
      if (changed.some((c) => c.startsWith('brand') || c === 'accent')) spec.palette = reconcile(spec.palette);
    }
  }

  if (changed.length === 0) {
    throw new BadRequest(`Could not interpret "${instruction}". Try e.g. "make it darker", "use the bold theme", or "change the headline to ...".`);
  }

  const result = await finalizeBuild(env, projectId, spec);
  return { ...result, changed };
}
