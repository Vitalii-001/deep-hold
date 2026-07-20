import { LAYER_FEATURES, type LayerFeatureConfig } from '../config/layerFeatures';

// Accessors for layer signatures (NEW_FEATURES.md §2). Each returns a neutral
// value (0 / 1) for layers without the relevant feature, so callers multiply /
// add unconditionally.

export function layerFeatureConfig(layerId: string): LayerFeatureConfig | null {
  return LAYER_FEATURES[layerId] ?? null;
}

// Mushroom Grotto: passive ale trickle, ale/sec.
export function aleSeepPerSec(layerId: string): number {
  const f = LAYER_FEATURES[layerId]?.feature;
  return f?.kind === 'aleSeep' ? f.alePerSec : 0;
}

// Gold Seams: multiplier on rock-chunk rewards.
export function chunkRewardMult(layerId: string): number {
  const f = LAYER_FEATURES[layerId]?.feature;
  return f?.kind === 'richChunks' ? f.rewardMult : 1;
}

// Iron Veins: extra simultaneous chunks allowed.
export function chunkMaxActiveBonus(layerId: string): number {
  const f = LAYER_FEATURES[layerId]?.feature;
  return f?.kind === 'denseChunks' ? f.maxActiveBonus : 0;
}

// Gem Hollows: multiplier on the find drop chance.
export function findDropMult(layerId: string): number {
  const f = LAYER_FEATURES[layerId]?.feature;
  return f?.kind === 'findRich' ? f.dropMult : 1;
}
