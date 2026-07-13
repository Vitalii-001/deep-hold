import type { BuildingId, Cost } from '../game/types';

export interface BuildingConfig {
  id: BuildingId;
  name: string;
  description: string;
  baseCost: Cost;
  costGrowth: number;
  maxLevel: number;
  unlockDepth: number;
}

export const BUILDINGS: Record<BuildingId, BuildingConfig> = {
  mineShaft: {
    id: 'mineShaft',
    name: 'Mine Shaft',
    description: '+3 miner slots per level.',
    baseCost: { stone: 50 },
    costGrowth: 1.6,
    maxLevel: 20,
    unlockDepth: 0,
  },
  brewery: {
    id: 'brewery',
    name: 'Brewery',
    description: '+2 brewer slots and +50 ale storage per level.',
    baseCost: { stone: 150 },
    costGrowth: 1.7,
    maxLevel: 15,
    unlockDepth: 25,
  },
  smelter: {
    id: 'smelter',
    name: 'Smelter',
    description: '+2 smith slots per level.',
    baseCost: { stone: 400 },
    costGrowth: 1.7,
    maxLevel: 15,
    unlockDepth: 75,
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    description: 'Better tools: x1.25 mining speed per level.',
    baseCost: { ingot: 10 },
    costGrowth: 1.8,
    maxLevel: 10,
    unlockDepth: 90,
  },
  greatHall: {
    id: 'greatHall',
    name: 'Great Hall',
    description: '+1 scout slot and +5% all production per level.',
    baseCost: { stone: 2000, ingot: 25 },
    costGrowth: 1.9,
    maxLevel: 10,
    unlockDepth: 120,
  },
  temple: {
    id: 'temple',
    name: 'Temple of the Ancestors',
    description: '-20% cave-in chance and +5% all production per level. Unlocks blessings.',
    baseCost: { gold: 150 },
    costGrowth: 2.0,
    maxLevel: 10,
    unlockDepth: 200,
  },
};
