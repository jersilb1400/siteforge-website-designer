// Prompt pack for AI site photography. Each role maps to a layout slot
// (hero / gallery / service). Prompts are photoreal, brand-safe (no text,
// logos, watermarks, or readable signage), and tuned per industry + theme.

export type ImageRole = 'hero' | 'gallery' | 'service' | 'atmosphere' | 'about';

export interface ImagePromptBrief {
  businessName: string;
  industry: string;
  tone?: string;
  themeId?: string;
  tagline?: string;
  recipeId?: string;
}

export interface ImagePrompt {
  role: ImageRole;
  alt: string;
  aspectRatio: '16:9' | '4:3' | '3:2' | '1:1';
  prompt: string;
}

export interface ImageSlotNeed {
  role: ImageRole;
  aspectRatio: '16:9' | '4:3' | '3:2' | '1:1';
}

const NEGATIVE =
  'No text, no logos, no watermarks, no readable signage, no UI overlays, no people with recognizable faces looking at camera, photorealistic, natural lighting.';

function themeCue(themeId?: string, tone?: string): string {
  const t = (themeId || '').toLowerCase();
  if (t === 'haven') return 'soft sage and warm brass accents, quiet editorial luxury, cinematic soft light';
  if (t === 'sanctuary') return 'warm wood, soft daylight through tall windows, reverent calm';
  if (t === 'storefront') return 'inviting hospitality lighting, textured materials, appetizing warmth';
  if (t === 'meridian') return 'clean clinical calm, airy neutrals, gentle natural light';
  if (t === 'forge') return 'honest craft materials, workshop grit softened for a website hero';
  if (t === 'ledger') return 'mission-forward community warmth, documentary sincerity';
  if (t === 'gallery') return 'minimal gallery lighting, strong composition, negative space';
  if (t === 'atelier') return 'refined professional interiors, quiet confidence';
  if ((tone || '').toLowerCase() === 'bold') return 'strong contrast, confident composition';
  if ((tone || '').toLowerCase() === 'warm') return 'warm tones, inviting atmosphere';
  return 'modern, clean, professional photography';
}

function industryScenes(industry: string): { hero: string; gallery: string[]; service: string[] } {
  switch (industry) {
    case 'Day spa / Salon':
      return {
        hero: 'a serene spa treatment suite with linen, soft towels, and diffused window light',
        gallery: [
          'hot stone massage setup on clean linen in a quiet room',
          'salon styling station with mirrors and soft overhead light',
          'facial skincare products and folded towels on a stone tray',
          'manicure detail with polished tools and calm neutrals',
          'spa reception desk with natural wood and plants',
          'massage room with warm ambient lighting and uncluttered surfaces',
        ],
        service: [
          'close-up of a facial treatment tray with botanical oils',
          'hands arranging hot stones beside a massage table',
          'freshly cut hair tools on a clean salon counter',
        ],
      };
    case 'Health & wellness':
      return {
        hero: 'a bright wellness studio with mats, soft daylight, and calm open space',
        gallery: [
          'quiet consultation corner with plants and natural wood',
          'yoga or movement practice space, empty and inviting',
          'herbal tea and wellness ritual on a wooden table',
          'meditation cushions in soft morning light',
          'recovery room with clean linens and gentle lighting',
        ],
        service: ['stretching props arranged neatly', 'calm clinic treatment bed ready for a session'],
      };
    case 'Restaurant / Cafe':
      return {
        hero: 'a warm restaurant dining room at golden hour, empty tables set with care',
        gallery: [
          'beautifully plated seasonal dish on ceramic',
          'chef plating in a clean kitchen, hands only',
          'bar and evening atmosphere with soft bokeh',
          'fresh ingredients on a prep table',
          'cafe counter with pastries and morning light',
        ],
        service: ['signature plated entree detail', 'espresso pour with crema close-up'],
      };
    case 'Church / Ministry':
      return {
        hero: 'a sunlit church sanctuary with empty pews and warm stained light',
        gallery: [
          'church exterior entrance in soft daylight',
          'community fellowship hall set for gathering',
          'open Bible and quiet prayer corner, no readable text',
          'children ministry room with soft colors, empty',
        ],
        service: ['welcome table with flowers near sanctuary doors'],
      };
    case 'Professional services (law, accounting, consulting)':
      return {
        hero: 'a modern professional office lobby with natural light and calm materials',
        gallery: [
          'conference room ready for a meeting',
          'desk with laptop and documents, no readable text',
          'team collaboration space with soft daylight',
          'building exterior of a refined office',
        ],
        service: ['consultation table with notebooks, no readable text'],
      };
    case 'Home & trade services':
      return {
        hero: 'a skilled tradesperson finishing quality work on a home exterior, mid-distance',
        gallery: [
          'tools laid out neatly for a job',
          'home renovation in progress, clean and professional',
          'finished craftsmanship detail on wood or tile',
          'van and gear staged outside a residence',
        ],
        service: ['close-up of finished trim work', 'organized tool bag on a job site'],
      };
    case 'Retail / shop':
      return {
        hero: 'a boutique retail interior with curated displays and soft daylight',
        gallery: [
          'product shelves styled with care',
          'storefront window display',
          'curated goods on a table',
          'fitting or checkout area, empty and inviting',
        ],
        service: ['hero product still life on linen'],
      };
    case 'Nonprofit':
      return {
        hero: 'volunteers serving community outdoors in warm daylight, faces soft and distant',
        gallery: [
          'hands joined in partnership, anonymous',
          'community event setup outdoors',
          'donation sorting table with care packages',
          'bright nonprofit office with mission wall art, no readable text',
        ],
        service: ['outreach supplies packed for distribution'],
      };
    case 'Personal brand / portfolio':
      return {
        hero: 'a creative studio workspace with strong composition and soft side light',
        gallery: [
          'design work on a desk, screens blurred',
          'sketchbook and creative tools',
          'portfolio prints on a wall, abstract',
          'workspace detail with plants and materials',
        ],
        service: ['project mood board without readable text'],
      };
    default:
      return {
        hero: 'a polished small-business storefront interior with inviting light',
        gallery: [
          'welcoming reception area',
          'detail of craftsmanship or product',
          'team workspace, empty and tidy',
          'exterior of the business in soft daylight',
        ],
        service: ['close-up of signature offering without text'],
      };
  }
}

/** Build an ordered list of image prompts for a site (hero first, then gallery/service). */
export function buildImagePrompts(brief: ImagePromptBrief, count: number): ImagePrompt[] {
  const n = Math.max(0, Math.min(count, 8));
  if (!n) return [];
  const scenes = industryScenes(brief.industry);
  const cue = themeCue(brief.themeId, brief.tone);
  const name = brief.businessName || 'the business';
  const out: ImagePrompt[] = [];

  out.push({
    role: 'hero',
    alt: `${name} — signature space`,
    aspectRatio: '16:9',
    prompt: `Editorial website hero photograph for ${name}, a ${brief.industry} business. Scene: ${scenes.hero}. Mood: ${cue}. Shot on a full-frame camera, shallow depth of field, high-end commercial photography. ${NEGATIVE}`,
  });

  let gi = 0;
  let si = 0;
  while (out.length < n) {
    if (out.length % 3 === 0 && scenes.service.length) {
      const scene = scenes.service[si % scenes.service.length]!;
      si++;
      out.push({
        role: 'service',
        alt: `${name} — detail`,
        aspectRatio: '4:3',
        prompt: `Website service detail photo for ${name} (${brief.industry}): ${scene}. Mood: ${cue}. Photoreal, commercial quality. ${NEGATIVE}`,
      });
    } else {
      const scene = scenes.gallery[gi % scenes.gallery.length]!;
      gi++;
      out.push({
        role: 'gallery',
        alt: `${name} — ${scene.split(',')[0]}`,
        aspectRatio: '4:3',
        prompt: `Website gallery photograph for ${name} (${brief.industry}): ${scene}. Mood: ${cue}. Photoreal, commercial quality. ${NEGATIVE}`,
      });
    }
  }

  return out.slice(0, n);
}

/** Build prompts for exact composition slots (role + aspect). */
export function buildImagePromptsForSlots(brief: ImagePromptBrief, slots: ImageSlotNeed[]): ImagePrompt[] {
  if (!slots.length) return [];
  const scenes = industryScenes(brief.industry);
  const cue = themeCue(brief.themeId, brief.tone);
  const name = brief.businessName || 'the business';
  let gi = 0;
  let si = 0;
  let ai = 0;

  return slots.map((slot) => {
    if (slot.role === 'hero') {
      return {
        role: 'hero',
        alt: `${name} — signature space`,
        aspectRatio: slot.aspectRatio,
        prompt: `Editorial website hero photograph for ${name}, a ${brief.industry} business. Scene: ${scenes.hero}. Mood: ${cue}. Wide cinematic composition for a full-bleed hero. ${NEGATIVE}`,
      };
    }
    if (slot.role === 'about') {
      const scene = scenes.gallery[ai++ % scenes.gallery.length]!;
      return {
        role: 'about',
        alt: `${name} — about`,
        aspectRatio: slot.aspectRatio,
        prompt: `Website about-page photograph for ${name} (${brief.industry}): ${scene}. Mood: ${cue}. Portrait-friendly composition. ${NEGATIVE}`,
      };
    }
    if (slot.role === 'service') {
      const scene =
        scenes.service[si++ % Math.max(1, scenes.service.length)] ||
        scenes.gallery[gi++ % scenes.gallery.length]!;
      return {
        role: 'service',
        alt: `${name} — offering`,
        aspectRatio: slot.aspectRatio,
        prompt: `Website service card photograph for ${name} (${brief.industry}): ${scene}. Mood: ${cue}. ${NEGATIVE}`,
      };
    }
    if (slot.role === 'atmosphere') {
      const scene = scenes.gallery[ai++ % scenes.gallery.length]!;
      return {
        role: 'atmosphere',
        alt: `${name} — atmosphere`,
        aspectRatio: slot.aspectRatio,
        prompt: `Atmospheric website photograph for ${name} (${brief.industry}): ${scene}. Mood: ${cue}. Soft, evocative, not a product shot. ${NEGATIVE}`,
      };
    }
    const scene = scenes.gallery[gi++ % scenes.gallery.length]!;
    return {
      role: 'gallery',
      alt: `${name} — ${scene.split(',')[0]}`,
      aspectRatio: slot.aspectRatio,
      prompt: `Website gallery photograph for ${name} (${brief.industry}): ${scene}. Mood: ${cue}. ${NEGATIVE}`,
    };
  });
}
