import type { GameState, ResourceId } from './types';
import { MARKET_PERK_MAP, SELLABLE_MAP } from '../config/market';

// Pure Market logic (NEW_FEATURES.md §3). The store wraps these; components
// never touch crowns/resources directly.

// Crowns paid per unit of a resource, scaled by how deep the hold has reached.
// Non-sellable resources (ale, ingot) return 0.
export function sellPrice(s: GameState, resource: ResourceId): number {
  const cfg = SELLABLE_MAP[resource];
  if (!cfg) return 0;
  return cfg.basePrice * (1 + cfg.depthPriceMult * s.depth);
}

// Sell up to `qty` of a resource (clamped to what's on hand), banking Crowns.
// No-op for non-sellables or when there is nothing to sell.
export function sellResource(s: GameState, resource: ResourceId, qty: number): GameState {
  if (!SELLABLE_MAP[resource]) return s;
  const have = s.resources[resource];
  const sold = Math.min(qty, have);
  if (sold <= 0) return s;
  return {
    ...s,
    resources: { ...s.resources, [resource]: have - sold },
    crowns: s.crowns + sold * sellPrice(s, resource),
  };
}

// Buy a one-time perk: pays Crowns, records it in marketPerks, and lands its
// modifier in permanentBonuses so economy.ts applies the effect. Idempotent;
// no-op when already owned or unaffordable.
export function buyMarketPerk(s: GameState, perkId: string): GameState {
  const perk = MARKET_PERK_MAP[perkId];
  if (!perk) return s;
  if (s.marketPerks.includes(perkId)) return s;
  if (s.crowns < perk.costCrowns) return s;

  const permanentBonuses = s.permanentBonuses.includes(perk.modifier)
    ? s.permanentBonuses
    : [...s.permanentBonuses, perk.modifier];

  return {
    ...s,
    crowns: s.crowns - perk.costCrowns,
    marketPerks: [...s.marketPerks, perkId],
    permanentBonuses,
  };
}
