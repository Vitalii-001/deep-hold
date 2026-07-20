import { expect, test } from 'vitest';
import { simulateOffline } from './offline';
import { initialState } from './store';
import { MILESTONES } from '../config/milestones';
import type { GameState } from './types';

const NOW = 2_000_000_000;

function miners(n: number): GameState {
  const s = initialState();
  s.workers.miner = n;
  s.resources.stone = 0; // start from zero so absolute-total assertions are clean
  s.resources.ale = 1e9; // effectively infinite for rate tests
  s.buildings.brewery = 1000; // huge ale storage so morale stays happy for the whole window
  return s;
}

test('offline gains at 50% of live rate', () => {
  // Past every milestone so their permanent production bonus is constant across
  // the window — otherwise depth-crossings would skew the flat 50% math.
  const s = miners(2);
  s.depth = 2000;
  s.milestonesReached = MILESTONES.map((m) => m.id);
  const bonus = MILESTONES.reduce((acc, m) => acc * m.mult, 1);
  const { state, summary } = simulateOffline(s, 3600, NOW);
  // live: 2 * 0.5 * 1.5 * bonus /s; offline x0.5 over 3600s. `gained` counts
  // only delivered hauls — the last batch may still sit at the face / on the
  // cart, so account for it explicitly (conservation must be exact).
  const expected = 2 * 0.5 * 1.5 * bonus * 0.5 * 3600;
  const inFlight = (state.cartBuffer.stone ?? 0) + (state.cart.load?.stone ?? 0);
  expect(summary.gained.stone + inFlight).toBeCloseTo(expected, 0);
  expect(state.resources.stone + inFlight).toBeCloseTo(expected, 0);
  expect(summary.elapsedSec).toBe(3600);
  expect(summary.metersDug).toBeGreaterThan(0);
  expect(state.records.bestOfflineYield.stone).toBe(summary.gained.stone);
});

test('offline time is capped at 12 hours', () => {
  const { summary } = simulateOffline(miners(2), 100 * 3600, NOW);
  expect(summary.elapsedSec).toBe(12 * 3600);
});

test('ale runs out offline and slows the second phase', () => {
  const s = initialState();
  s.workers.miner = 2;
  s.resources.ale = 1; // tiny
  const { summary } = simulateOffline(s, 3600, NOW);
  const { summary: rich } = simulateOffline(miners(2), 3600, NOW);
  expect(summary.gained.stone).toBeLessThan(rich.gained.stone);
  expect(summary.gained.stone).toBeGreaterThan(0);
});

test('offline does not advance the playedSec game-time clock', () => {
  const s = miners(2);
  s.playedSec = 500;
  const { state } = simulateOffline(s, 3600, NOW);
  expect(state.playedSec).toBe(500);
});

test('mining method keeps working offline but cave-ins never fire', () => {
  const s = miners(2);
  s.miningMethod = 'bulk';
  const { state } = simulateOffline(s, 12 * 3600, NOW);
  expect(state.miningMethod).toBe('bulk');
  expect(state.caveInUntil).toBe(0);
});

test('royal order timers pause offline', () => {
  const s = miners(2);
  s.activeOrders = [{ templateId: 'wallStone', remainingSec: 120 }];
  const { state, summary } = simulateOffline(s, 3600, NOW);
  expect(state.activeOrders).toEqual([{ templateId: 'wallStone', remainingSec: 120 }]);
  expect(summary.ordersPaused).toBe(1);
  expect(summary.events.some((e) => e.includes('Royal Orders'))).toBe(true);
});

test('return timers mature by wall-clock while offline', () => {
  const s = miners(2);
  s.expeditions = [{ templateId: 'stoutBatch', remainingSec: 1800 }];
  const { state, summary } = simulateOffline(s, 1800, NOW);
  expect(state.expeditions[0].remainingSec).toBe(0);
  expect(summary.expeditionsReady).toEqual(['stoutBatch']);
  expect(summary.events.some((e) => e.includes('Stout Maturation'))).toBe(true);
});
