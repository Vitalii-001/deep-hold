import type { StatId } from '../game/types';

// Ale quality/recipe modes (Phase 1, NEW_GAME_ARCHITECTURE.md §6.6): no
// ingredient resources in v1 — modes trade brew volume for work bonuses.
// Stat bonuses apply only while the hold is not dry (dwarves must actually
// be drinking the stuff) — see economy.getStatBreakdown.
export type BrewModeId = 'thin' | 'stout' | 'glowbrew';

export interface BrewModeConfig {
  id: BrewModeId;
  name: string;
  description: string;
  brewRateMult: number; // multiplier on ale produced per brewer
  stats?: Partial<Record<StatId, number>>; // work bonuses while supplied
  strangeChancePerSec?: number; // glowbrew: chance to trigger a strange discovery
}

export const BREW_MODES: Record<BrewModeId, BrewModeConfig> = {
  thin: {
    id: 'thin',
    name: 'Thin Ale',
    description: 'Watered down, plentiful. Keeps the workforce going.',
    brewRateMult: 1.3,
  },
  stout: {
    id: 'stout',
    name: 'Stout',
    description: 'Slow to brew, but the picks swing harder.',
    brewRateMult: 0.7,
    stats: { mining: 1.15, dig: 1.1 },
  },
  glowbrew: {
    id: 'glowbrew',
    name: 'Glowbrew',
    description: 'The mushrooms hum. The dwarves dig like the possessed. Strange things happen.',
    brewRateMult: 0.8,
    stats: { dig: 1.2 },
    strangeChancePerSec: 1 / 300, // roughly one strange event per 5 minutes of glowbrew
  },
};

export const BREW_MODE_LIST: BrewModeConfig[] = Object.values(BREW_MODES);
