import type { ResourceId } from '../game/types';

// Market / Trading Post (NEW_FEATURES.md §3). Sell surplus RAW resources for
// Crowns, spend Crowns on quality-of-life perks (never active production).
// All numbers tune here. Gated behind the Trading Post building.

export interface SellableConfig {
  resource: ResourceId; // raw only — ale & ingot are never sellable
  basePrice: number; // Crowns per unit at the surface
  depthPriceMult: number; // price *= (1 + this * depth) — deeper hold, better rates
}

export interface MarketPerkConfig {
  id: string; // doubles as the config/modifiers.ts id whose effect it grants
  name: string;
  costCrowns: number;
  description: string;
  modifier: string; // MODIFIERS id added to permanentBonuses on purchase
}

export const SELLABLES: SellableConfig[] = [
  { resource: 'stone', basePrice: 0.1, depthPriceMult: 0.001 },
  { resource: 'ore', basePrice: 0.6, depthPriceMult: 0.001 },
  { resource: 'gold', basePrice: 4, depthPriceMult: 0.001 },
  { resource: 'gem', basePrice: 18, depthPriceMult: 0.001 },
];

export const MARKET_PERKS: MarketPerkConfig[] = [
  { id: 'deepCellar', name: 'Deep Cellar', costCrowns: 40, description: '+200 ale storage.', modifier: 'deepCellar' },
  { id: 'nightShiftPact', name: 'Night Shift Pact', costCrowns: 80, description: '+25% offline yield.', modifier: 'nightShiftPact' },
  { id: 'mastersLedger', name: "Master's Ledger", costCrowns: 220, description: '+40% offline yield.', modifier: 'mastersLedger' },
];

export const SELLABLE_MAP: Partial<Record<ResourceId, SellableConfig>> = Object.fromEntries(
  SELLABLES.map((s) => [s.resource, s]),
);
export const MARKET_PERK_MAP: Record<string, MarketPerkConfig> = Object.fromEntries(
  MARKET_PERKS.map((p) => [p.id, p]),
);
