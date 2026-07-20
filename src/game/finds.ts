import {
  FINDS,
  LAYER_SET_BONUSES,
  type FindConfig,
  type FindRarity,
  type LayerSetBonusConfig,
} from '../config/finds';
import { BALANCE } from '../config/balance';
import { findDropMult } from './layerFeatures';

// Pure logic for collectible finds (NEW_FEATURES.md §1). No component ever
// passes amounts — the store rolls every find through rollFind here.

export function findsOfLayer(layerId: string): FindConfig[] {
  return FINDS.filter((f) => f.layerId === layerId);
}

// Drop weight by rarity: common shows up most, legendary is a treat.
export function rarityWeight(rarity: FindRarity): number {
  switch (rarity) {
    case 'common':
      return 3;
    case 'rare':
      return 1;
    case 'legendary':
      return 0.4;
  }
}

// Roll a find for a just-mined chunk of `layerId`. Two rng draws: one for the
// drop chance (boosted while the layer has yielded nothing yet, so the player
// always meets the mechanic), one for the weighted pick among uncollected
// finds of that layer. Returns null on a miss or an exhausted layer.
export function rollFind(
  layerId: string,
  findsCollected: string[],
  rng: () => number = Math.random,
): FindConfig | null {
  const layerFinds = findsOfLayer(layerId);
  if (layerFinds.length === 0) return null;
  const collected = new Set(findsCollected);
  const uncollected = layerFinds.filter((f) => !collected.has(f.id));
  if (uncollected.length === 0) return null;

  const cfg = BALANCE.finds;
  const noneYet = uncollected.length === layerFinds.length;
  // Layer signature (§2): findRich layers (Gem Hollows) shake loose more finds.
  const boost = (noneYet ? cfg.firstFindBoost : 1) * findDropMult(layerId);
  const chance = Math.min(0.95, cfg.dropChancePerChunk * boost);
  if (rng() >= chance) return null;

  const weights = uncollected.map((f) => rarityWeight(f.rarity));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < uncollected.length; i += 1) {
    r -= weights[i];
    if (r < 0) return uncollected[i];
  }
  return uncollected[uncollected.length - 1];
}

// Set bonuses whose entire layer has been collected — aggregated by economy.ts
// exactly like displayed-artifact bonuses.
export function completedLayerSetBonuses(findsCollected: string[]): LayerSetBonusConfig[] {
  const collected = new Set(findsCollected);
  return LAYER_SET_BONUSES.filter((b) => {
    const layerFinds = findsOfLayer(b.layerId);
    return layerFinds.length > 0 && layerFinds.every((f) => collected.has(f.id));
  });
}
