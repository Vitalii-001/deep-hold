import type { Cost, GameState } from '../game/types';
import { nextLayer } from './layers';

// Return timers (Phase 3.4): unlike Royal Orders, these are meant to mature
// while the player is away. They are deliberately small and config-driven so
// future ad slots / free alternatives can reuse the same actions.
export interface ExpeditionConfig {
  id: string;
  title: string;
  description: string;
  durationSec: number;
  unlock: (s: GameState) => boolean;
  canStart?: (s: GameState) => boolean;
  cost?: Cost;
  rewardLabel: string;
  freeRushSec: number;
  freeRushCost: Cost;
  adRushSec: number;
}

export const EXPEDITIONS: ExpeditionConfig[] = [
  {
    id: 'stoutBatch',
    title: 'Stout Maturation',
    description: 'Set aside a few casks. In 30 minutes they return as a stronger cellar reserve.',
    durationSec: 30 * 60,
    unlock: (s) => s.buildings.brewery >= 1,
    cost: { ale: 20 },
    rewardLabel: '+80 Ale, capped by storage',
    freeRushSec: 5 * 60,
    freeRushCost: { stone: 120 },
    adRushSec: 15 * 60,
  },
  {
    id: 'scoutReport',
    title: 'Scout Expedition',
    description: 'Send scouts ahead. The report completes a survey for the next layer.',
    durationSec: 60 * 60,
    unlock: (s) => s.workers.scout >= 1,
    canStart: (s) => nextLayer(s.depth) !== null,
    rewardLabel: 'Survey report for the next layer',
    freeRushSec: 10 * 60,
    freeRushCost: { stone: 250, ale: 15 },
    adRushSec: 20 * 60,
  },
];

export const EXPEDITION_MAP: Record<string, ExpeditionConfig> = Object.fromEntries(
  EXPEDITIONS.map((e) => [e.id, e]),
);
