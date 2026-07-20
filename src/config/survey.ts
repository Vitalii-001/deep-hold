// Scout survey (Phase 2.3, Hartman: prospecting precedes exploitation).
// Scouts fill the survey of the NEXT layer; at 100% one bonus is rolled and
// stays attached to that layer permanently.
export type SurveyBonusId = 'richVein' | 'stableTunnel' | 'wetCrack' | 'ancientCache';

export interface SurveyBonusConfig {
  id: SurveyBonusId;
  name: string;
  toast: string;
}

export const SURVEY_BONUSES: SurveyBonusConfig[] = [
  { id: 'richVein', name: 'Rich Vein', toast: '🗺️ Survey complete: a Rich Vein! Secondary yields boosted in this layer.' },
  { id: 'stableTunnel', name: 'Stable Tunnel', toast: '🗺️ Survey complete: Stable Tunnels — cave-in risk halved in this layer.' },
  { id: 'wetCrack', name: 'Wet Crack', toast: '🗺️ Survey complete: a Wet Crack — the brewers love this water.' },
  { id: 'ancientCache', name: 'Ancient Cache', toast: '🗺️ Survey complete: an Ancient Cache of gold!' },
];

export const SURVEY = {
  pctPerScoutPerSec: 0.25, // one scout completes a survey in ~6.7 minutes
  richVeinYieldMult: 1.5, // secondary yields in the surveyed layer
  stableTunnelCaveInMult: 0.5,
  wetCrackBrewMult: 1.15, // brew bonus while digging that layer
  ancientCacheGold: 25, // one-time grant on completion
} as const;
