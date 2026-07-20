import type { Cost, GameState } from '../game/types';

// Royal Orders (Phase 3.2): parallel timed micro-goals — the "one more contract"
// retention hook. Game-time timers (§6.5): they pause offline. Expiry is
// penalty-free (§R7). Rewards are either resources (repeatable) or a permanent
// modifier (one-time — the order stops being offered once its modifier is owned).
export interface OrderConfig {
  id: string;
  title: string;
  minDepth: number; // not offered until the hold reaches this depth
  durationSec: number; // game-time window
  progress: (s: GameState) => { current: number; target: number };
  deliver?: Cost; // consumed from resources on claim (a sink); else the goal is just "own"
  reward: { resources?: Cost; modifier?: string };
}

export const ORDERS: OrderConfig[] = [
  {
    id: 'wallStone',
    title: 'Deliver 500 Stone for the walls',
    minDepth: 0,
    durationSec: 300,
    progress: (s) => ({ current: s.resources.stone, target: 500 }),
    deliver: { stone: 500 },
    reward: { resources: { ale: 40 } },
  },
  {
    id: 'smithsOre',
    title: 'Ship 100 Ore to the smiths',
    minDepth: 75,
    durationSec: 360,
    progress: (s) => ({ current: s.resources.ore, target: 100 }),
    deliver: { ore: 100 },
    reward: { modifier: 'ironPact' },
  },
  {
    id: 'feastAle',
    title: 'Brew 200 Ale for a royal feast',
    minDepth: 25,
    durationSec: 420,
    progress: (s) => ({ current: s.resources.ale, target: 200 }),
    deliver: { ale: 200 },
    reward: { modifier: 'brewersGuild' },
  },
  {
    id: 'armoryIngots',
    title: 'Deliver 25 Ingots to the armory',
    minDepth: 90,
    durationSec: 480,
    progress: (s) => ({ current: s.resources.ingot, target: 25 }),
    deliver: { ingot: 25 },
    reward: { modifier: 'deepMineCharter' },
  },
  {
    id: 'ingotQuota',
    title: 'Deliver 40 Ingots for the quota',
    minDepth: 120,
    durationSec: 480,
    progress: (s) => ({ current: s.resources.ingot, target: 40 }),
    deliver: { ingot: 40 },
    reward: { resources: { gold: 60 } },
  },
  {
    id: 'pushDeep',
    title: 'Push the dig to 300 m',
    minDepth: 200,
    durationSec: 600,
    progress: (s) => ({ current: s.depth, target: 300 }),
    reward: { resources: { gold: 80 } },
  },
  {
    id: 'goldHoard',
    title: 'Amass 200 Gold in the treasury',
    minDepth: 200,
    durationSec: 540,
    progress: (s) => ({ current: s.resources.gold, target: 200 }),
    reward: { modifier: 'gildedPicks' },
  },
  {
    id: 'surveyPact',
    title: 'Complete a scout survey',
    minDepth: 120,
    durationSec: 600,
    progress: (s) => ({ current: Object.keys(s.surveyBonuses).length, target: 1 }),
    reward: { modifier: 'royalFavor' },
  },
  {
    id: 'gemCut',
    title: 'Cut 15 Gems for the crown',
    minDepth: 450,
    durationSec: 600,
    progress: (s) => ({ current: s.resources.gem, target: 15 }),
    deliver: { gem: 15 },
    reward: { modifier: 'ancestralWard' },
  },
];

export const ORDER_MAP: Record<string, OrderConfig> = Object.fromEntries(ORDERS.map((o) => [o.id, o]));
export const MAX_ACTIVE_ORDERS = 3;
