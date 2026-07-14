import type { Cost, WorkerId } from '../game/types';

export interface WorkerConfig {
  id: WorkerId;
  name: string;
  description: string;
  baseCost: Cost;
  costGrowth: number;
  baseRate: number; // per second per worker: stone (miner), conversions (smith), ale (brewer), m (scout — see BALANCE.dig.perScout)
}

export const WORKERS: Record<WorkerId, WorkerConfig> = {
  miner: {
    id: 'miner',
    name: 'Miner',
    description: 'Digs stone and whatever the layer holds.',
    baseCost: { stone: 15 },
    costGrowth: 1.18,
    baseRate: 0.5,
  },
  smith: {
    id: 'smith',
    name: 'Smith',
    description: 'Smelts ore into ingots (2 ore per ingot).',
    baseCost: { stone: 100 },
    costGrowth: 1.18,
    baseRate: 0.2,
  },
  brewer: {
    id: 'brewer',
    name: 'Brewer',
    description: 'Brews the ale that keeps the hold working.',
    baseCost: { stone: 80 },
    costGrowth: 1.18,
    baseRate: 0.4,
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    description: 'Charts the way down. Digging goes faster.',
    baseCost: { gold: 10 },
    costGrowth: 1.25,
    baseRate: 0.15,
  },
};
