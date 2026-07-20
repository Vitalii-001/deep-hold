import type { ResourceId } from '../game/types';

export interface LayerConfig {
  id: string;
  name: string;
  depth: number; // starts at this depth (m)
  color: string; // band + UI accent
  // Hardness divides dig speed inside the layer — the primary pacing "wall"
  // mechanism (NEW_GAME_ARCHITECTURE.md §6.7). Walls are beaten with dig
  // upgrades, Stout/Glowbrew, the Bulk method and scouts.
  hardness: number;
  hazard: number; // cave-in risk multiplier while Bulk-mining this layer
  baseYield: Partial<Record<ResourceId, number>>; // secondary yield ratio of mining rate (stone implicit 1)
  flavor: string;
}

export const LAYERS: LayerConfig[] = [
  {
    id: 'dirt',
    name: 'Topsoil',
    depth: 0,
    color: '#7a5a3a',
    hardness: 1,
    hazard: 1,
    baseYield: {},
    flavor: 'Soft dirt. Even a beardless dwarfling could dig this.',
  },
  {
    id: 'stone',
    name: 'Stone',
    depth: 25,
    color: '#8a8a8a',
    hardness: 1.8,
    hazard: 1,
    baseYield: {},
    flavor: 'Proper rock at last. The picks sing.',
  },
  {
    id: 'mushroom',
    name: 'Mushroom Grotto',
    depth: 50,
    color: '#5e7a4a',
    hardness: 1.6,
    hazard: 0.8,
    baseYield: {},
    flavor: 'Soft caves full of glowing caps. The brewers look thoughtful.',
  },
  {
    id: 'iron',
    name: 'Iron Veins',
    depth: 75,
    color: '#9c6b4f',
    hardness: 3.2,
    hazard: 1.1,
    baseYield: { ore: 0.3 },
    flavor: 'Iron ore! Fire up the smelter.',
  },
  {
    id: 'coal',
    name: 'Coal Seams',
    depth: 120,
    color: '#4a443e',
    hardness: 4.8,
    hazard: 1.2,
    baseYield: { ore: 0.25 },
    flavor: 'Black dust everywhere. The forges will feast on this.',
  },
  {
    id: 'gold',
    name: 'Gold Seams',
    depth: 200,
    color: '#c9a227',
    hardness: 7.5,
    hazard: 1.2,
    baseYield: { ore: 0.2, gold: 0.1 },
    flavor: 'Gold gleams in the torchlight.',
  },
  {
    id: 'flooded',
    name: 'Flooded Caverns',
    depth: 300,
    color: '#38668a',
    hardness: 11,
    hazard: 1.5,
    baseYield: { ore: 0.12, gold: 0.06 },
    flavor: 'Cold water seeps from every crack. Mind your footing.',
  },
  {
    id: 'gems',
    name: 'Gem Hollows',
    depth: 450,
    color: '#7b4fa0',
    hardness: 18,
    hazard: 1.3,
    baseYield: { gold: 0.08, gem: 0.04 },
    flavor: 'Crystals hum softly in the dark.',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Belt',
    depth: 700,
    color: '#241a2e',
    hardness: 36,
    hazard: 1.4,
    baseYield: { gold: 0.05, gem: 0.06 },
    flavor: 'Black glass that laughs at picks. This wall must be earned.',
  },
  {
    id: 'ruins',
    name: 'Ancient Ruins',
    depth: 1000,
    color: '#3f4f5f',
    hardness: 55,
    hazard: 1.6,
    baseYield: { gold: 0.15, gem: 0.08 },
    flavor: 'Carved halls older than any clan. Something below is... breathing?',
  },
];

export function layerAtDepth(depth: number): LayerConfig {
  let result = LAYERS[0];
  for (const layer of LAYERS) {
    if (depth >= layer.depth) result = layer;
  }
  return result;
}

// The layer below the current one (survey target); null at the bottom.
export function nextLayer(depth: number): LayerConfig | null {
  return LAYERS.find((l) => l.depth > depth) ?? null;
}
