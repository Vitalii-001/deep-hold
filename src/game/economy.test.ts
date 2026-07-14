import { expect, test } from 'vitest';
import {
  aleStorage, buildingCost, canAfford, isStriking, payCost, scaledCost, statMult, workerCap, workerCost, digSpeed,
} from './economy';
import type { GameState } from './types';
import { BALANCE } from '../config/balance';
import { WORKERS } from '../config/workers';
import { BUILDINGS } from '../config/buildings';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    resources: { stone: 0, ore: 0, ingot: 0, gold: 0, gem: 0, ale: 20 },
    workers: { miner: 0, smith: 0, brewer: 0, scout: 0 },
    buildings: { mineShaft: 0, smelter: 0, forge: 0, brewery: 0, greatHall: 0, temple: 0 },
    upgrades: [],
    depth: 0,
    milestonesReached: [],
    digMode: 'careful',
    caveInUntil: 0,
    blessingUntil: 0,
    muted: false,
    tutorialDone: [],
    ...over,
  };
}

test('scaledCost grows geometrically and rounds up', () => {
  expect(scaledCost({ stone: 10 }, 1.15, 0)).toEqual({ stone: 10 });
  expect(scaledCost({ stone: 10 }, 1.15, 1)).toEqual({ stone: 12 }); // ceil(11.5)
});

test('canAfford and payCost', () => {
  const res = { stone: 100, ore: 0, ingot: 0, gold: 0, gem: 0, ale: 0 };
  expect(canAfford(res, { stone: 100 })).toBe(true);
  expect(canAfford(res, { stone: 101 })).toBe(false);
  expect(canAfford(res, { stone: 50, gold: 1 })).toBe(false);
  expect(payCost(res, { stone: 40 }).stone).toBe(60);
});

test('worker cost scales with owned count', () => {
  const s = baseState({ workers: { miner: 2, smith: 0, brewer: 0, scout: 0 } });
  const w = WORKERS.miner;
  expect(workerCost(s, 'miner').stone).toBe(Math.ceil(w.baseCost.stone! * w.costGrowth ** 2));
});

test('building cost scales with level', () => {
  const s = baseState();
  const b = BUILDINGS.mineShaft;
  expect(buildingCost(s, 'mineShaft').stone).toBe(b.baseCost.stone!);
  s.buildings.mineShaft = 2;
  expect(buildingCost(s, 'mineShaft').stone).toBe(Math.ceil(b.baseCost.stone! * b.costGrowth ** 2));
});

test('worker caps come from buildings', () => {
  const s = baseState();
  expect(workerCap(s, 'miner')).toBe(5);
  expect(workerCap(s, 'smith')).toBe(0);
  const s2 = baseState({ buildings: { ...s.buildings, mineShaft: 2, smelter: 1 } });
  expect(workerCap(s2, 'miner')).toBe(11);
  expect(workerCap(s2, 'smith')).toBe(2);
});

test('ale storage grows with brewery', () => {
  expect(aleStorage(baseState())).toBe(50);
  const s = baseState();
  s.buildings.brewery = 3;
  expect(aleStorage(s)).toBe(200);
});

test('statMult stacks upgrades, buildings, and blessing', () => {
  const now = 1_000_000;
  const s = baseState({ upgrades: ['sharpPicks'] }); // mining x1.5
  expect(statMult(s, 'mining', now)).toBeCloseTo(1.5);
  s.buildings.forge = 1; // x1.25 mining
  expect(statMult(s, 'mining', now)).toBeCloseTo(1.875);
  s.buildings.greatHall = 1; // x1.05 all production
  expect(statMult(s, 'mining', now)).toBeCloseTo(1.5 * 1.25 * 1.05);
  s.blessingUntil = now + 1000; // x2 production
  expect(statMult(s, 'mining', now)).toBeCloseTo(1.5 * 1.25 * 1.05 * 2);
  // blessing does not touch non-production stats
  expect(statMult(s, 'dig', now)).toBe(1);
});

test('digSpeed: workers, mode, upgrades; no morale', () => {
  const now = 0;
  const s = baseState({ workers: { miner: 2, smith: 0, brewer: 0, scout: 1 } });
  const expected = BALANCE.dig.baseSpeed + 2 * BALANCE.dig.perMiner + 1 * BALANCE.dig.perScout;
  expect(digSpeed(s, now)).toBeCloseTo(expected);
  s.digMode = 'reckless';
  expect(digSpeed(s, now)).toBeCloseTo(expected * BALANCE.dig.recklessMult);
});

test('isStriking: no workers never strike', () => {
  const s = baseState({ workers: { miner: 0, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 0;
  expect(isStriking(s)).toBe(false);
});

test('isStriking: workers with no ale are on strike', () => {
  const s = baseState({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 0;
  expect(isStriking(s)).toBe(true);
});

test('isStriking: plenty of ale means no strike', () => {
  const s = baseState({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 50;
  expect(isStriking(s)).toBe(false);
});
