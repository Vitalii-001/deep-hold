import { expect, test } from 'vitest';
import { evaluateTutorial } from './tutorial';
import { initialState } from './store';
import type { GameState } from './types';

function base(over: Partial<GameState> = {}): GameState {
  // Most steps assume the King's Hall intro is behind the player.
  return { ...initialState(), onboarding: { introSeen: true }, ...over };
}

test('truly fresh game: visitKingsHall greets the player first', () => {
  const { active, toComplete } = evaluateTutorial({ ...base(), onboarding: { introSeen: false } }, null);
  expect(active?.id).toBe('visitKingsHall');
  expect(toComplete).toEqual([]);
});

test('after the intro: hireMiner is active (starting stone affords it)', () => {
  const { active, toComplete } = evaluateTutorial(base(), null);
  expect(active?.id).toBe('hireMiner');
  expect(toComplete).toEqual(['visitKingsHall']);
});

test('a step auto-completed this pass is never returned as active', () => {
  // miner hired + shaft affordable: hireMiner completes, buildShaft (not hireMiner) is active
  const s = base({ workers: { ...base().workers, miner: 1 }, resources: { ...base().resources, stone: 50 } });
  const { active, toComplete } = evaluateTutorial(s, null);
  expect(toComplete).toContain('hireMiner');
  expect(active?.id).not.toBe('hireMiner');
});

test('already-done steps are skipped', () => {
  const s = base({
    workers: { ...base().workers, miner: 1 },
    resources: { ...base().resources, stone: 50 },
    tutorialDone: ['hireMiner'],
  });
  const { toComplete, active } = evaluateTutorial(s, null);
  expect(toComplete).not.toContain('hireMiner');
  expect(active?.id).toBe('buildShaft');
});

test('veteran save: all non-strike steps auto-complete, no active hint', () => {
  const s = base({
    depth: 300,
    workers: { miner: 5, smith: 1, brewer: 2, scout: 0 },
    buildings: { mineShaft: 3, smelter: 1, forge: 0, brewery: 2, greatHall: 0, temple: 0, tradingPost: 0 },
    resources: { stone: 1e6, ore: 0, ingot: 0, gold: 0, gem: 0, ale: 200 },
  });
  const { active, toComplete } = evaluateTutorial(s, null);
  expect(active).toBeNull();
  expect(toComplete).toEqual(['visitKingsHall', 'hireMiner', 'buildShaft', 'buildBrewery', 'hireBrewer']);
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
    tutorialDone: ['hireMiner', 'buildShaft', 'buildBrewery', 'hireBrewer'],
  });
  s.resources.ale = 0;
  const { active } = evaluateTutorial(s, null);
  expect(active?.id).toBe('strikeExplain');
});
