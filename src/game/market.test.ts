import { expect, test } from 'vitest';
import { buyMarketPerk, sellPrice, sellResource } from './market';
import { MARKET_PERKS, SELLABLES } from '../config/market';
import { MODIFIERS } from '../config/modifiers';
import { statMult } from './economy';
import { initialState } from './store';
import type { GameState } from './types';

function state(over: Partial<GameState> = {}): GameState {
  return { ...initialState(), ...over };
}

test('sellables are raw resources only — never ale or ingot', () => {
  const ids = SELLABLES.map((s) => s.resource);
  expect(ids).not.toContain('ale');
  expect(ids).not.toContain('ingot');
});

test('every market perk maps to a real modifier', () => {
  for (const perk of MARKET_PERKS) {
    expect(MODIFIERS[perk.modifier]).toBeTruthy();
  }
});

test('sell price rises with depth', () => {
  const shallow = state({ depth: 0 });
  const deep = state({ depth: 1000 });
  expect(sellPrice(deep, 'gem')).toBeGreaterThan(sellPrice(shallow, 'gem'));
});

test('non-sellable resources have no price and cannot be sold', () => {
  const s = state();
  s.resources.ale = 100;
  s.resources.ingot = 100;
  expect(sellPrice(s, 'ale')).toBe(0);
  expect(sellResource(s, 'ingot', 10)).toBe(s); // unchanged reference
});

test('selling banks crowns and clamps to what is on hand', () => {
  const s = state({ depth: 100 });
  s.resources.gold = 5;
  const after = sellResource(s, 'gold', 999); // ask for more than we have
  expect(after.resources.gold).toBe(0);
  expect(after.crowns).toBeCloseTo(5 * sellPrice(s, 'gold'));
});

test('buying a perk pays crowns, records it, and activates its modifier effect', () => {
  const s = state({ crowns: 500 });
  const perk = MARKET_PERKS.find((p) => p.modifier === 'nightShiftPact')!;
  const before = statMult(s, 'offline', 0);
  const after = buyMarketPerk(s, perk.id);
  expect(after.crowns).toBe(500 - perk.costCrowns);
  expect(after.marketPerks).toContain(perk.id);
  expect(after.permanentBonuses).toContain(perk.modifier);
  expect(statMult(after, 'offline', 0)).toBeGreaterThan(before);
});

test('perks cannot be bought twice or without enough crowns', () => {
  const perk = MARKET_PERKS[0];
  const owned = state({ crowns: 1000, marketPerks: [perk.id] });
  expect(buyMarketPerk(owned, perk.id)).toBe(owned); // already owned
  const broke = state({ crowns: 0 });
  expect(buyMarketPerk(broke, perk.id)).toBe(broke); // cannot afford
});
