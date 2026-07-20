import { expect, test } from 'vitest';
import { simulateTick } from './tick';
import { initialState } from './store';
import { BALANCE } from '../config/balance';
import type { GameState } from './types';

const NOW = 1_000_000_000;
const never = () => 1;

function state(over: Partial<GameState> = {}): GameState {
  const s = { ...initialState(), ...over };
  s.resources = { ...s.resources, stone: 0 }; // production tests measure output from zero
  return s;
}

// Mined output regardless of where the haul cycle put it: still at the face,
// on the cart, or already delivered.
function minedTotal(s: GameState, rid: 'stone' | 'ore' | 'gold' | 'gem'): number {
  return (s.cartBuffer[rid] ?? 0) + (s.cart.load?.[rid] ?? 0) + s.resources[rid];
}

test('miners produce stone (merry: x1.5 with ale)', () => {
  const s = state({ workers: { miner: 2, smith: 0, brewer: 0, scout: 0 } });
  const next = simulateTick(s, 10, NOW, never);
  // 2 miners * 0.5/s * 1.5 morale * 10s = 15
  expect(next.resources.stone).toBeCloseTo(15);
});

test('workers drink ale; strike when it runs out', () => {
  const s = state({ workers: { miner: 2, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 0;
  const next = simulateTick(s, 10, NOW, never);
  // strike: 2 * 0.5 * 0.6 * 10 = 6
  expect(next.resources.stone).toBeCloseTo(6);
});

test('ale is consumed over time', () => {
  const s = state({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  const next = simulateTick(s, 10, NOW, never);
  expect(next.resources.ale).toBeCloseTo(20 - 5 * BALANCE.ale.consumptionPerWorker * 10);
});

test('smiths convert ore to ingots, bounded by available ore', () => {
  const s = state({
    workers: { miner: 0, smith: 1, brewer: 0, scout: 0 },
    buildings: { ...initialState().buildings, smelter: 1 }, // capacity comes from the smelter now
  });
  s.resources.ore = 1; // only enough for 0.5 ingots
  const next = simulateTick(s, 100, NOW, never);
  expect(next.resources.ingot).toBeCloseTo(0.5);
  expect(next.resources.ore).toBeCloseTo(0);
});

test('brewers fill ale up to storage cap', () => {
  const s = state({ workers: { miner: 0, smith: 0, brewer: 5, scout: 0 } });
  const next = simulateTick(s, 1000, NOW, never);
  expect(next.resources.ale).toBe(50); // storageBase, no brewery levels
});

test('layer yields: at iron depth miners also produce ore', () => {
  const s = state({ depth: 100, workers: { miner: 2, smith: 0, brewer: 0, scout: 0 } });
  const next = simulateTick(s, 10, NOW, never);
  expect(minedTotal(next, 'ore')).toBeCloseTo(15 * 0.3); // 30% of base mined (balanced)
});

test('selective trades stone for richer veins; bulk the reverse', () => {
  const base = () => state({ depth: 100, workers: { miner: 2, smith: 0, brewer: 0, scout: 0 } });
  const balanced = simulateTick(base(), 10, NOW, never);
  const sel = simulateTick({ ...base(), miningMethod: 'selective' }, 10, NOW, never);
  const bulk = simulateTick({ ...base(), miningMethod: 'bulk' }, 10, NOW, never);
  expect(minedTotal(sel, 'ore')).toBeGreaterThan(minedTotal(balanced, 'ore'));
  expect(minedTotal(sel, 'stone')).toBeLessThan(minedTotal(balanced, 'stone'));
  expect(minedTotal(bulk, 'stone')).toBeGreaterThan(minedTotal(balanced, 'stone'));
  expect(minedTotal(bulk, 'ore')).toBeLessThan(minedTotal(balanced, 'ore'));
  expect(bulk.depth).toBeGreaterThan(balanced.depth);
});

test('cart credits mined stone only after the haul completes', () => {
  const s = state({ depth: 100, workers: { miner: 2, smith: 0, brewer: 0, scout: 0 } });
  // one short tick: everything mined is still at the face or on the cart
  const early = simulateTick(s, 5, NOW, never);
  expect(early.resources.stone).toBe(0);
  expect(minedTotal(early, 'stone')).toBeGreaterThan(0);
  // load + up (100 m / 12 mps) + unload < 15 s -> first haul has been delivered
  const later = simulateTick(early, 10, NOW, never);
  expect(later.resources.stone).toBeGreaterThan(0);
});

test('smelter capacity caps conversions (processing bottleneck)', () => {
  const s = state({
    workers: { miner: 0, smith: 10, brewer: 0, scout: 0 },
    buildings: { ...initialState().buildings, smelter: 1 },
  });
  s.resources.ore = 1e6;
  s.resources.ale = 1e6; // keep morale merry... capped by storage anyway
  const next = simulateTick(s, 10, NOW, never);
  // capacity: 1 smelter level * 0.5 conversions/s * 10s = 5 ingots max
  expect(next.resources.ingot).toBeLessThanOrEqual(5 + 1e-9);
});

test('scouts survey the next layer and roll a bonus at 100%', () => {
  // Iron veins (75..120): scouts dig slowly through hardness 2.5, so the
  // survey target (coal) stays stable across both ticks.
  const s = state({ depth: 76, workers: { miner: 0, smith: 0, brewer: 0, scout: 4 } });
  s.resources.ale = 50;
  // 4 scouts * 0.25%/s = 1%/s -> 100s to complete; rng 0 at completion -> richVein
  const mid = simulateTick(s, 50, NOW, () => 0.99);
  expect(mid.surveyProgress.coal).toBeCloseTo(50);
  expect(mid.surveyBonuses.coal).toBeUndefined();
  const done = simulateTick({ ...mid, resources: { ...mid.resources, ale: 50 } }, 60, NOW, () => 0);
  expect(done.surveyProgress.coal).toBe(100);
  expect(done.surveyBonuses.coal).toBe('richVein');
});

test('digging advances depth and reaches milestones', () => {
  const s = state({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  // careful mode, no upgrades: descent = (baseSpeed + 5*perMiner), merry x1.5
  const speed = BALANCE.dig.baseSpeed + 5 * BALANCE.dig.perMiner;
  const expected = speed * BALANCE.ale.happyMult * 100; // over 100s
  const next = simulateTick(s, 100, NOW, never);
  expect(next.depth).toBeCloseTo(expected);
  expect(next.milestonesReached).toContain('m10');
});

test('bulk mining can trigger a cave-in: stun + stone loss', () => {
  const s = state({ miningMethod: 'bulk', workers: { miner: 1, smith: 0, brewer: 0, scout: 0 } });
  s.resources.stone = 1000;
  const next = simulateTick(s, 1, NOW, () => 0); // rng 0 < chance -> cave-in
  expect(next.caveInUntil).toBe(NOW + BALANCE.dig.caveIn.stunSec * 1000);
  expect(next.resources.stone).toBeLessThan(1001); // 10% of pre-tick stone destroyed
});

test('careful mode never caves in', () => {
  const s = state({ miningMethod: 'balanced' });
  const next = simulateTick(s, 1, NOW, () => 0);
  expect(next.caveInUntil).toBe(0);
});

test('cave-in stun multiplies production by stunMult', () => {
  const s = state({ workers: { miner: 2, smith: 0, brewer: 0, scout: 0 }, caveInUntil: NOW + 10_000 });
  const next = simulateTick(s, 10, NOW, never);
  // 2 * 0.5 * 1.5 * 0.25 * 10 = 3.75
  expect(next.resources.stone).toBeCloseTo(3.75);
});

test('tick accumulates the playedSec game-time clock', () => {
  const s = state();
  const next = simulateTick(simulateTick(s, 10, NOW, never), 2.5, NOW + 10_000, never);
  expect(next.playedSec).toBeCloseTo(12.5);
});

test('tick completes satisfied charter goals', () => {
  const s = state({ workers: { miner: 1, smith: 0, brewer: 0, scout: 0 } });
  s.resources.stone = 40; // first charter goal is now "Gather 40 Stone"
  const next = simulateTick(s, 0.1, NOW, never);
  expect(next.charterGoalsDone).toEqual(['c1-gatherStone', 'c1-hireMiner']);
});

test('tick queues a discovery once its depth is reached', () => {
  const shallow = simulateTick(state({ depth: 5 }), 0.1, NOW, never);
  expect(shallow.pendingDiscoveryId).toBeNull();
  const deep = simulateTick(state({ depth: 15 }), 0.1, NOW, never);
  expect(deep.pendingDiscoveryId).toBe('buriedCart');
});

test('tick does not queue a second discovery while one is pending', () => {
  const s = state({ depth: 60, pendingDiscoveryId: 'buriedCart' });
  const next = simulateTick(s, 0.1, NOW, never);
  expect(next.pendingDiscoveryId).toBe('buriedCart');
});

test('thirsty band: morale slides between dry and merry', () => {
  const s = state({ workers: { miner: 10, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 0.5; // ratio 1% of 50 storage — deep in the thirsty band
  const next = simulateTick(s, 10, NOW, never);
  // mult = 0.6 + (1.5-0.6) * (0.01/0.25) = 0.636; mined = 10 * 0.5 * 0.636 * 10
  expect(next.resources.stone).toBeCloseTo(31.8);
});

test('brewers are immune to bad morale and keep the thin-mode rate', () => {
  const s = state({ workers: { miner: 10, smith: 0, brewer: 1, scout: 0 } });
  s.resources.ale = 0; // dry: everyone else at 0.6, brewers at 1.0
  const next = simulateTick(s, 10, NOW, never);
  // brewed = 1 * 0.4 * 1.3(thin) * 1.0 * 10 = 5.2; thirst consumed it all except what fits
  // drink of 11 workers over 10s = 2.2 from ale 0 -> ale stays 0 before brew; after brew = 5.2
  expect(next.resources.ale).toBeCloseTo(5.2);
  // miners still slowed to strike pace
  expect(next.resources.stone).toBeCloseTo(10 * 0.5 * 0.6 * 10);
});

test('glowbrew can trigger a strange discovery', () => {
  const s = state({ brewMode: 'glowbrew', workers: { miner: 1, smith: 0, brewer: 1, scout: 0 } });
  const next = simulateTick(s, 1, NOW, () => 0); // rng 0 -> strange roll hits
  expect(next.pendingDiscoveryId).toBe('singingMold');
  // thin mode never rolls strange events
  const thin = simulateTick(state(), 1, NOW, () => 0);
  expect(thin.pendingDiscoveryId).toBeNull();
});
