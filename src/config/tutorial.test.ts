import { expect, test } from 'vitest';
import { TUTORIAL_STEPS } from './tutorial';
import { initialState } from '../game/store';
import type { GameState } from '../game/types';

function base(over: Partial<GameState> = {}): GameState {
  return { ...initialState(), ...over };
}
const step = (id: string) => TUTORIAL_STEPS.find((s) => s.id === id)!;

test('there are six steps with unique ids in order', () => {
  const ids = TUTORIAL_STEPS.map((s) => s.id);
  expect(ids).toEqual(['clickMine', 'hireMiner', 'buildShaft', 'buildBrewery', 'hireBrewer', 'strikeExplain']);
});

test('clickMine shows on a fresh game and completes at 15 stone', () => {
  const s = base();
  expect(step('clickMine').showWhen(s)).toBe(true);
  expect(step('clickMine').doneWhen(s)).toBe(false);
  s.resources.stone = 15;
  expect(step('clickMine').showWhen(s)).toBe(false);
  expect(step('clickMine').doneWhen(s)).toBe(true);
});

test('hireMiner shows once affordable, completes on first miner', () => {
  const s = base({ resources: { ...base().resources, stone: 15 } });
  expect(step('hireMiner').showWhen(s)).toBe(true);
  s.workers.miner = 1;
  expect(step('hireMiner').showWhen(s)).toBe(false);
  expect(step('hireMiner').doneWhen(s)).toBe(true);
});

test('buildShaft needs a miner and 50 stone', () => {
  const s = base({ workers: { ...base().workers, miner: 1 }, resources: { ...base().resources, stone: 50 } });
  expect(step('buildShaft').showWhen(s)).toBe(true);
  s.buildings.mineShaft = 1;
  expect(step('buildShaft').doneWhen(s)).toBe(true);
  expect(step('buildShaft').showWhen(s)).toBe(false);
});

test('buildBrewery shows at 25 m, completes when built', () => {
  const s = base({ depth: 25 });
  expect(step('buildBrewery').showWhen(s)).toBe(true);
  s.buildings.brewery = 1;
  expect(step('buildBrewery').doneWhen(s)).toBe(true);
  expect(step('buildBrewery').showWhen(s)).toBe(false);
});

test('hireBrewer shows once a brewery exists', () => {
  const s = base({ buildings: { ...base().buildings, brewery: 1 } });
  expect(step('hireBrewer').showWhen(s)).toBe(true);
  s.workers.brewer = 1;
  expect(step('hireBrewer').doneWhen(s)).toBe(true);
  expect(step('hireBrewer').showWhen(s)).toBe(false);
});

test('strikeExplain shows during a strike and is marked requiresShown', () => {
  const s = base({ workers: { ...base().workers, miner: 3 } });
  s.resources.ale = 0; // striking
  expect(step('strikeExplain').requiresShown).toBe(true);
  expect(step('strikeExplain').showWhen(s)).toBe(true);
  expect(step('strikeExplain').doneWhen(s)).toBe(false);
  s.resources.ale = 50; // ale restored
  expect(step('strikeExplain').doneWhen(s)).toBe(true);
});
