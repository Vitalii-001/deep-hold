import type { ResourceId } from '../game/types';

export interface LayerConfig {
  id: string;
  name: string;
  depth: number; // starts at this depth (m)
  color: string; // canvas band + UI accent
  yields: Partial<Record<ResourceId, number>>; // secondary yield ratio of mining rate (stone is implicit 1)
  flavor: string;
}

export const LAYERS: LayerConfig[] = [
  {
    id: 'dirt',
    name: 'Topsoil',
    depth: 0,
    color: '#7a5a3a',
    yields: {},
    flavor: 'Soft dirt. Even a beardless dwarfling could dig this.',
  },
  {
    id: 'stone',
    name: 'Stone',
    depth: 25,
    color: '#8a8a8a',
    yields: {},
    flavor: 'Proper rock at last. The picks sing.',
  },
  {
    id: 'iron',
    name: 'Iron Veins',
    depth: 75,
    color: '#9c6b4f',
    yields: { ore: 0.3 },
    flavor: 'Iron ore! Fire up the smelter.',
  },
  {
    id: 'gold',
    name: 'Gold Seams',
    depth: 200,
    color: '#c9a227',
    yields: { ore: 0.2, gold: 0.1 },
    flavor: 'Gold gleams in the torchlight.',
  },
  {
    id: 'gems',
    name: 'Gem Hollows',
    depth: 450,
    color: '#7b4fa0',
    yields: { gold: 0.08, gem: 0.04 },
    flavor: 'Crystals hum softly in the dark.',
  },
  {
    id: 'ruins',
    name: 'Ancient Ruins',
    depth: 1000,
    color: '#3f4f5f',
    yields: { gold: 0.15, gem: 0.08 },
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