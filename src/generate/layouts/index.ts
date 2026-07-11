import type { LayoutVariant } from '../composition/types';
import type { LayoutRenderer } from './types';
import { editorialLuxuryRenderer } from './editorial-luxury';
import { warmHospitalityRenderer } from './warm-hospitality';
import { reverentSanctuaryRenderer } from './reverent-sanctuary';
import { cleanClinicRenderer } from './clean-clinic';
import { craftTradeRenderer } from './craft-trade';
import { missionLedgerRenderer } from './mission-ledger';

const RENDERERS: Record<LayoutVariant, LayoutRenderer> = {
  'editorial-luxury': editorialLuxuryRenderer,
  'warm-hospitality': warmHospitalityRenderer,
  'reverent-sanctuary': reverentSanctuaryRenderer,
  'clean-clinic': cleanClinicRenderer,
  'craft-trade': craftTradeRenderer,
  'mission-ledger': missionLedgerRenderer,
};

export function getLayoutRenderer(variant: LayoutVariant): LayoutRenderer {
  return RENDERERS[variant];
}
