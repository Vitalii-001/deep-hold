// Layer signatures (NEW_FEATURES.md §2): one memorable twist per layer beyond
// harder rock. v1 uses only passive / derived features — no new saved state,
// no event timers. Each is read in place by the relevant system (see
// src/game/layerFeatures.ts accessors). Add more by extending this map.

export type LayerFeature =
  | { kind: 'aleSeep'; alePerSec: number } // Mushroom Grotto: spores drip a little ale
  | { kind: 'richChunks'; rewardMult: number } // Gold Seams: chunk rewards run richer
  | { kind: 'denseChunks'; maxActiveBonus: number } // Iron Veins: magnetic clusters — more chunks at once
  | { kind: 'findRich'; dropMult: number }; // Gem Hollows: resonance shakes loose more finds

export interface LayerFeatureConfig {
  feature: LayerFeature;
  tagIcon: string; // emoji placeholder for the Active Face tag (final: atlas feat_<kind>)
  tagLabel: string;
}

export const LAYER_FEATURES: Record<string, LayerFeatureConfig> = {
  mushroom: { feature: { kind: 'aleSeep', alePerSec: 0.15 }, tagIcon: '🍄', tagLabel: 'Spore Seep' },
  iron: { feature: { kind: 'denseChunks', maxActiveBonus: 1 }, tagIcon: '🧲', tagLabel: 'Magnetic' },
  gold: { feature: { kind: 'richChunks', rewardMult: 1.5 }, tagIcon: '✨', tagLabel: 'Rich Seams' },
  gems: { feature: { kind: 'findRich', dropMult: 2 }, tagIcon: '💠', tagLabel: 'Resonant' },
};
