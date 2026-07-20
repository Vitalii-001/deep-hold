import type { Cost, GameState, ResourceId } from './types';
import { BALANCE } from '../config/balance';
import type { LayerConfig } from '../config/layers';
import { productionRates } from './economy';
import { chunkRewardMult } from './layerFeatures';

// Rock chunks in the shaft walls (multi-click deposits, Mr.-Mine-style). All
// math lives here — the UI only spawns/click-reports; the store rolls every
// reward through these helpers so components can never fabricate amounts.

// Layer-flavored chunk label (game-facing copy, used as tooltip).
export function hotspotLabel(layer: LayerConfig): string {
  if (layer.baseYield.gem) return 'Gem Crack';
  if (layer.baseYield.gold) return 'Gold Spark';
  if (layer.baseYield.ore) return 'Ore Chunk';
  return 'Loose Stone';
}

// Which resource the chunk *looks like*: the rarest secondary the layer
// offers, plain stone otherwise. Mirrors hotspotLabel.
export function chunkResource(layer: LayerConfig): ResourceId {
  if (layer.baseYield.gem) return 'gem';
  if (layer.baseYield.gold) return 'gold';
  if (layer.baseYield.ore) return 'ore';
  return 'stone';
}

// Clicks needed to mine a chunk out, rolled once at spawn.
export function rollChunkClicks(rng: () => number = Math.random): number {
  const cfg = BALANCE.mineInteractions;
  return cfg.clicksMin + Math.floor(rng() * (cfg.clicksMax - cfg.clicksMin + 1));
}

// One click's worth of reward. The whole-chunk budget is a few seconds of
// current stone output (hard-capped, floor of rewardMinStone) split evenly
// across the chunk's clicks — never below 1 stone per click. Each click also
// has a small chance to shake loose a pinch of the chunk layer's rarest
// secondary. The layer is the *chunk's* layer, not the dig face's.
export function rollChunkClickReward(
  s: GameState,
  layer: LayerConfig,
  totalClicks: number,
  rng: () => number = Math.random,
): Cost {
  const cfg = BALANCE.mineInteractions;
  const clicks = Math.min(cfg.clicksMax, Math.max(cfg.clicksMin, Math.floor(totalClicks) || 0));
  const rates = productionRates(s);
  const budget = Math.min(
    cfg.rewardMaxStone,
    Math.max(cfg.rewardMinStone, rates.mining * cfg.rewardMiningSec),
  );
  // Layer signature (§2): rich-seam layers (Gold) pay chunk rewards richer —
  // applied after the base cap, so it is a genuine layer perk.
  const richMult = chunkRewardMult(layer.id);
  const stone = Math.max(1, Math.round((budget / clicks) * richMult));
  const reward: Cost = { stone };

  const secondaries = Object.entries(layer.baseYield) as [ResourceId, number][];
  if (secondaries.length > 0 && rng() < cfg.secondaryChance) {
    // pick the rarest (lowest-ratio) secondary the layer offers — feels special
    const [rid, ratio] = secondaries.reduce((a, b) => (a[1] <= b[1] ? a : b));
    reward[rid] = Math.max(1, Math.round(stone * ratio * cfg.secondaryCapMult));
  }
  return reward;
}
