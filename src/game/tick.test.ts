import { expect, test } from 'vitest';
import { simulateTick } from './tick';
import { initialState } from './store';
import { BALANCE } from '../config/balance';
import type { GameState } from './types';

const NOW = 1_000_000_000;
const never = () => 1;

function state(over: Partial<GameState> = {}): GameState {
  return { ...initialState(), ...over };
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
  // strike: 2 * 0.5 * 0.4 * 10 = 4
  expect(next.resources.stone).toBeCloseTo(4);
});

test('ale is consumed over time', () => {
  const s = state({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  const next = simulateTick(s, 10, NOW, never);
  expect(next.resources.ale).toBeCloseTo(20 - 5 * BALANCE.ale.consumptionPerWorker * 10);
});

test('smiths convert ore to ingots, bounded by available ore', () => {
  const s = state({ workers: { miner: 0, smith: 1, brewer: 0, scout: 0 } });
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
  expect(next.resources.ore).toBeCloseTo(15 * 0.3); // 30% of stone mined
});

test('digging advances depth and reaches milestones', () => {
  const s = state({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  // speed = 0.05 + 5*0.02 = 0.15 m/s, merry x1.5 = 0.225; 50s -> 11.25 m
  const next = simulateTick(s, 50, NOW, never);
  expect(next.depth).toBeCloseTo(11.25);
  expect(next.milestonesReached).toContain('m10');
});

test('reckless mode can trigger a cave-in: stun + stone loss', () => {
  const s = state({ digMode: 'reckless', workers: { miner: 1, smith: 0, brewer: 0, scout: 0 } });
  s.resources.stone = 1000;
  const next = simulateTick(s, 1, NOW, () => 0); // rng 0 < chance -> cave-in
  expect(next.caveInUntil).toBe(NOW + BALANCE.dig.caveIn.stunSec * 1000);
  expect(next.resources.stone).toBeLessThan(1001); // 10% of pre-tick stone destroyed
});

test('careful mode never caves in', () => {
  const s = state({ digMode: 'careful' });
  const next = simulateTick(s, 1, NOW, () => 0);
  expect(next.caveInUntil).toBe(0);
});

test('cave-in stun multiplies production by stunMult', () => {
  const s = state({ workers: { miner: 2, smith: 0, brewer: 0, scout: 0 }, caveInUntil: NOW + 10_000 });
  const next = simulateTick(s, 10, NOW, never);
  // 2 * 0.5 * 1.5 * 0.25 * 10 = 3.75
  expect(next.resources.stone).toBeCloseTo(3.75);
});