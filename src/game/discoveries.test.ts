import { expect, test } from 'vitest';
import { applyDiscoveryChoice, getNextPendingDiscovery } from './discoveries';
import { DISCOVERY_MAP } from '../config/discoveries';
import { BALANCE } from '../config/balance';
import { initialState } from './store';
import type { GameState } from './types';

const NOW = 1_000_000_000;

function state(over: Partial<GameState> = {}): GameState {
  const s = { ...initialState(), ...over };
  s.resources = { ...s.resources, stone: 0 }; // measure discovery grants from zero
  return s;
}

function option(discoveryId: string, optionId: string) {
  const d = DISCOVERY_MAP[discoveryId];
  return { discovery: d, option: d.options.find((o) => o.id === optionId)! };
}

test('no discovery pending above the first trigger depth', () => {
  expect(getNextPendingDiscovery(state({ depth: 11.9 }))).toBeNull();
});

test('reaching 12 m queues the Buried Cart', () => {
  expect(getNextPendingDiscovery(state({ depth: 12 }))!.id).toBe('buriedCart');
});

test('only one discovery is pending at a time', () => {
  const s = state({ depth: 60, pendingDiscoveryId: 'buriedCart' });
  expect(getNextPendingDiscovery(s)).toBeNull();
});

test('seen discoveries are skipped; the next shallowest unseen one queues', () => {
  const s = state({ depth: 60, discoveriesSeen: ['buriedCart', 'coldSpring'] });
  expect(getNextPendingDiscovery(s)!.id).toBe('mushroomNook');
});

test('choice applies the gain, records itself and clears pending', () => {
  const s = state({ depth: 15, pendingDiscoveryId: 'buriedCart' });
  const { discovery, option: opt } = option('buriedCart', 'salvage');
  const next = applyDiscoveryChoice(s, discovery, opt, NOW);
  expect(next.resources.stone).toBe(25);
  expect(next.discoveriesSeen).toEqual(['buriedCart']);
  expect(next.discoveryChoices).toEqual({ buriedCart: 'salvage' });
  expect(next.pendingDiscoveryId).toBeNull();
  expect(next.caveInUntil).toBe(0); // salvage carries no risk
});

test('choices are one-time: a resolved discovery cannot be re-applied', () => {
  const s = state({ depth: 15, pendingDiscoveryId: 'buriedCart' });
  const { discovery, option: opt } = option('buriedCart', 'smash');
  const once = applyDiscoveryChoice(s, discovery, opt, NOW, () => 1);
  expect(applyDiscoveryChoice(once, discovery, opt, NOW, () => 1)).toBe(once);
  // even if pending were forced back on, the seen guard holds
  const forced = { ...once, pendingDiscoveryId: 'buriedCart' };
  expect(applyDiscoveryChoice(forced, discovery, opt, NOW, () => 1)).toBe(forced);
});

test('risky choice can trigger a cave-in', () => {
  const s = state({ depth: 15, pendingDiscoveryId: 'buriedCart' });
  const { discovery, option: opt } = option('buriedCart', 'smash');
  const hit = applyDiscoveryChoice(s, discovery, opt, NOW, () => 0);
  expect(hit.resources.stone).toBe(60);
  expect(hit.caveInUntil).toBe(NOW + BALANCE.dig.caveIn.stunSec * 1000);
  const miss = applyDiscoveryChoice(s, discovery, opt, NOW, () => 1);
  expect(miss.caveInUntil).toBe(0);
});

test('costed option requires affordability and pays the cost', () => {
  const s = state({ depth: 80, pendingDiscoveryId: 'ironShrine' });
  const { discovery, option: opt } = option('ironShrine', 'offering');
  s.resources.stone = 10; // cannot afford the 30-stone offering
  expect(applyDiscoveryChoice(s, discovery, opt, NOW)).toBe(s);
  s.resources.stone = 50;
  const next = applyDiscoveryChoice(s, discovery, opt, NOW);
  expect(next.resources.stone).toBe(20);
  expect(next.resources.ingot).toBe(5);
  expect(next.permanentBonuses).toContain('ancientKnowledge');
});

test('discovery choices can grant permanent modifiers', () => {
  const s = state({ depth: 130, pendingDiscoveryId: 'clanBanner' });
  const { discovery, option: opt } = option('clanBanner', 'hang');
  const next = applyDiscoveryChoice(s, discovery, opt, NOW);
  expect(next.resources.stone).toBe(150);
  expect(next.permanentBonuses).toContain('clanHonor');
});

test('ale gains are capped by storage', () => {
  const s = state({ depth: 30, pendingDiscoveryId: 'coldSpring' });
  s.resources.ale = 40; // storage 50 with no brewery
  const { discovery, option: opt } = option('coldSpring', 'pipe');
  const next = applyDiscoveryChoice(s, discovery, opt, NOW);
  expect(next.resources.ale).toBe(50);
});

test('a choice for the wrong pending discovery is ignored', () => {
  const s = state({ depth: 30, pendingDiscoveryId: 'coldSpring' });
  const { discovery, option: opt } = option('buriedCart', 'salvage');
  expect(applyDiscoveryChoice(s, discovery, opt, NOW)).toBe(s);
});
