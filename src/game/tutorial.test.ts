import { expect, test } from 'vitest';
import { evaluateTutorial } from './tutorial';
import { initialState } from './store';
import type { GameState } from './types';

function base(over: Partial<GameState> = {}): GameState {
  return { ...initialState(), ...over };
}

test('fresh game: clickMine is active, nothing to complete', () => {
  const { active, toComplete } = evaluateTutorial(base(), null);
  expect(active?.id).toBe('clickMine');
  expect(toComplete).toEqual([]);
});

test('at 15 stone: clickMine auto-completes and hireMiner becomes active', () => {
  const s = base({ resources: { ...base().resources, stone: 15 } });
  const { active, toComplete } = evaluateTutorial(s, 'clickMine');
  expect(toComplete).toContain('clickMine');
  expect(active?.id).toBe('hireMiner');
});

test('a step auto-completed this pass is never returned as active', () => {
  const s = base({ resources: { ...base().resources, stone: 15 } });
  const { active, toComplete } = evaluateTutorial(s, null);
  expect(toComplete).toContain('clickMine');
  expect(active?.id).not.toBe('clickMine');
});

test('already-done steps are skipped', () => {
  const s = base({ resources: { ...base().resources, stone: 15 }, tutorialDone: ['clickMine'] });
  const { toComplete, active } = evaluateTutorial(s, null);
  expect(toComplete).not.toContain('clickMine');
  expect(active?.id).toBe('hireMiner');
});

test('veteran save: all non-strike steps auto-complete, no active hint', () => {
  const s = base({
    depth: 300,
    workers: { miner: 5, smith: 1, brewer: 2, scout: 0 },
    buildings: { mineShaft: 3, smelter: 1, forge: 0, brewery: 2, greatHall: 0, temple: 0 },
    resources: { stone: 1e6, ore: 0, ingot: 0, gold: 0, gem: 0, ale: 200 },
  });
  const { active, toComplete } = evaluateTutorial(s, null);
  expect(active).toBeNull();
  expect(toComplete).toEqual(['clickMine', 'hireMiner', 'buildShaft', 'buildBrewery', 'hireBrewer']);
});

test('requiresShown gates strikeExplain: not completed unless it is the shown step', () => {
  // Not striking, so doneWhen (!isStriking) is true — but it must not complete
  // until it has actually been shown.
  const s = base({ workers: { ...base().workers, miner: 3 }, resources: { ...base().resources, ale: 200 } });
  expect(evaluateTutorial(s, null).toComplete).not.toContain('strikeExplain');
  expect(evaluateTutorial(s, 'strikeExplain').toComplete).toContain('strikeExplain');
});

test('strikeExplain becomes active during a strike', () => {
  const s = base({
    workers: { miner: 3, smith: 0, brewer: 0, scout: 0 },
    tutorialDone: ['clickMine', 'hireMiner', 'buildShaft', 'buildBrewery', 'hireBrewer'],
  });
  s.resources.ale = 0;
  const { active } = evaluateTutorial(s, null);
  expect(active?.id).toBe('strikeExplain');
});
