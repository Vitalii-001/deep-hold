import { expect, test } from 'vitest';
import { simulateOffline } from './offline';
import { initialState } from './store';
import type { GameState } from './types';

const NOW = 2_000_000_000;

function miners(n: number): GameState {
  const s = initialState();
  s.workers.miner = n;
  s.resources.ale = 1e9; // effectively infinite for rate tests
  s.buildings.brewery = 1000; // huge ale storage so morale stays happy for the whole window
  return s;
}

test('offline gains at 50% of live rate', () => {
  const { state, summary } = simulateOffline(miners(2), 3600, NOW);
  // live: 2 * 0.5 * 1.5 = 1.5/s; offline x0.5 => 0.75/s * 3600 = 2700
  expect(summary.gained.stone).toBeCloseTo(2700, 0);
  expect(state.resources.stone).toBeCloseTo(2700, 0);
  expect(summary.elapsedSec).toBe(3600);
  expect(summary.metersDug).toBeGreaterThan(0);
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

test('dig mode is preserved and no cave-in happens offline', () => {
  const s = miners(2);
  s.digMode = 'reckless';
  const { state } = simulateOffline(s, 12 * 3600, NOW);
  expect(state.digMode).toBe('reckless');
  expect(state.caveInUntil).toBe(0);
});
