import { expect, test } from 'vitest';
import {
  aleStorage, brewerMoraleMult, buildingCost, canAfford, getStatBreakdown, isStriking, moraleInfo, payCost, scaledCost, statMult, workerCap, workerCost, digSpeed, totalWorkers, caveInChancePerSec,
} from './economy';
import type { GameState } from './types';
import { BALANCE } from '../config/balance';
import { WORKERS } from '../config/workers';
import { BUILDINGS } from '../config/buildings';
import { MINING_METHODS } from '../config/miningMethods';
import { SURVEY } from '../config/survey';
import { initialRecords } from './records';

function baseState(over: Partial<GameState> = {}): GameState {
  return {
    resources: { stone: 0, ore: 0, ingot: 0, gold: 0, gem: 0, ale: 20 },
    cartBuffer: {},
    cart: { phase: 'loading', phaseLeftSec: 0, tripDepth: 0, load: null, lastDelivery: null },
    workers: { miner: 0, smith: 0, brewer: 0, scout: 0 },
    buildings: { mineShaft: 0, smelter: 0, forge: 0, brewery: 0, greatHall: 0, temple: 0, tradingPost: 0 },
    upgrades: [],
    depth: 0,
    milestonesReached: [],
    miningMethod: 'balanced',
    surveyProgress: {},
    surveyBonuses: {},
    caveInUntil: 0,
    blessingUntil: 0,
    muted: false,
    playedSec: 0,
    brewMode: 'thin',
    feastUntilSec: 0,
    feastCooldownUntilSec: 0,
    rallyReadyAtSec: 0,
    tutorialDone: [],
    onboarding: { introSeen: false },
    charterGoalsDone: [],
    discoveriesSeen: [],
    discoveryChoices: {},
    pendingDiscoveryId: null,
    permanentBonuses: [],
    activeOrders: [],
    ordersCompleted: [],
    expeditions: [],
    trophiesEarned: [],
    artifactsFound: [],
    displayedArtifacts: [],
    findsCollected: [],
    crowns: 0,
    marketPerks: [],
    newAwards: [],
    records: initialRecords(),
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

test('displayed artifacts can modify storage and stat breakdown', () => {
  const now = 0;
  const s = baseState({
    artifactsFound: ['ancientTankard', 'firstHammerHead'],
    displayedArtifacts: ['ancientTankard', 'firstHammerHead'],
  });
  expect(aleStorage(s)).toBeCloseTo(55);
  expect(getStatBreakdown(s, 'smelt', now).map((b) => b.source)).toContain('artifact:firstHammerHead');
  expect(statMult(s, 'smelt', now)).toBeCloseTo(1.05);
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

test('moraleInfo: merry above the band, gradient inside, dry at the bottom, idle without workers', () => {
  expect(moraleInfo(baseState()).state).toBe('idle');
  const s = baseState({ workers: { miner: 4, smith: 0, brewer: 0, scout: 0 } });
  expect(moraleInfo(s)).toEqual({ state: 'merry', mult: BALANCE.ale.happyMult }); // 20/50 = 40%
  s.resources.ale = 5; // 10% — thirsty
  const thirsty = moraleInfo(s);
  expect(thirsty.state).toBe('thirsty');
  expect(thirsty.mult).toBeGreaterThan(BALANCE.ale.strikeMult);
  expect(thirsty.mult).toBeLessThan(BALANCE.ale.happyMult);
  s.resources.ale = 0; // dry
  expect(moraleInfo(s)).toEqual({ state: 'dry', mult: BALANCE.ale.strikeMult });
});

test('brewerMoraleMult never drops below 1 but keeps the merry bonus', () => {
  const s = baseState({ workers: { miner: 4, smith: 0, brewer: 1, scout: 0 } });
  expect(brewerMoraleMult(s)).toBe(BALANCE.ale.happyMult);
  s.resources.ale = 0;
  expect(brewerMoraleMult(s)).toBe(1);
});

test('brew-mode bonuses register only while supplied; feast only in its window', () => {
  const now = 0;
  const s = baseState({ brewMode: 'stout', workers: { miner: 1, smith: 0, brewer: 0, scout: 0 } });
  expect(getStatBreakdown(s, 'mining', now).map((b) => b.source)).toContain('brew:stout');
  s.resources.ale = 0; // dry — no bonus from ale nobody drinks
  expect(getStatBreakdown(s, 'mining', now).map((b) => b.source)).not.toContain('brew:stout');

  const f = baseState({ playedSec: 100, feastUntilSec: 200 });
  expect(getStatBreakdown(f, 'mining', now).map((b) => b.source)).toContain('feast');
  f.playedSec = 250; // window over
  expect(getStatBreakdown(f, 'mining', now).map((b) => b.source)).not.toContain('feast');
  // feast boosts production stats only, not digging
  const f2 = baseState({ playedSec: 100, feastUntilSec: 200 });
  expect(getStatBreakdown(f2, 'dig', now).map((b) => b.source)).not.toContain('feast');
});

test('getStatBreakdown: labeled sources whose product equals statMult', () => {
  const now = 1_000_000;
  const s = baseState({ upgrades: ['sharpPicks'], milestonesReached: ['m10', 'm25'] });
  s.buildings.forge = 2;
  s.blessingUntil = now + 1000;
  const breakdown = getStatBreakdown(s, 'mining', now);
  const sources = breakdown.map((b) => b.source);
  expect(sources).toContain('upgrade:sharpPicks');
  expect(sources).toContain('building:forge');
  expect(sources).toContain('blessing');
  expect(sources).toContain('milestone:m10');
  expect(sources).toContain('milestone:m25');
  const product = breakdown.reduce((m, b) => m * b.mult, 1);
  expect(product).toBeCloseTo(statMult(s, 'mining', now));
  // inactive sources are not listed
  expect(getStatBreakdown(baseState(), 'mining', now)).toEqual([]);
});

test('digSpeed: workers x method / layer hardness; no morale', () => {
  const now = 0;
  const s = baseState({ workers: { miner: 2, smith: 0, brewer: 0, scout: 1 } });
  const raw = BALANCE.dig.baseSpeed + 2 * BALANCE.dig.perMiner + 1 * BALANCE.dig.perScout;
  expect(digSpeed(s, now)).toBeCloseTo(raw / 1); // topsoil hardness 1
  s.miningMethod = 'bulk';
  expect(digSpeed(s, now)).toBeCloseTo((raw * MINING_METHODS.bulk.digMult) / 1);
  s.miningMethod = 'selective';
  s.depth = 80; // iron veins
  const ironHardness = 3.2;
  expect(digSpeed(s, now)).toBeCloseTo((raw * MINING_METHODS.selective.digMult) / ironHardness);
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

test('totalWorkers sums all four worker types', () => {
  const s = baseState({ workers: { miner: 3, smith: 1, brewer: 2, scout: 1 } });
  expect(totalWorkers(s)).toBe(7);
  expect(totalWorkers(baseState())).toBe(0);
});

test('caveInChancePerSec: zero unless Bulk; scaled by hazard, survey and temple', () => {
  const s = baseState();
  expect(caveInChancePerSec(s)).toBe(0); // balanced is safe
  s.miningMethod = 'bulk';
  expect(caveInChancePerSec(s)).toBeCloseTo(BALANCE.dig.caveIn.chancePerSec); // topsoil hazard 1
  s.buildings.temple = 2;
  expect(caveInChancePerSec(s)).toBeCloseTo(
    BALANCE.dig.caveIn.chancePerSec * Math.pow(1 - BALANCE.dig.caveIn.templeReductionPerLevel, 2),
  );
  s.buildings.temple = 0;
  s.depth = 320; // flooded caverns, hazard 1.5
  expect(caveInChancePerSec(s)).toBeCloseTo(BALANCE.dig.caveIn.chancePerSec * 1.5);
  s.surveyBonuses = { flooded: 'stableTunnel' };
  expect(caveInChancePerSec(s)).toBeCloseTo(
    BALANCE.dig.caveIn.chancePerSec * 1.5 * SURVEY.stableTunnelCaveInMult,
  );
});
