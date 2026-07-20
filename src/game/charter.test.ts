import { expect, test } from 'vitest';
import {
  applyCharterCompletions,
  getCharterProgress,
  getCompletedGoals,
  getCurrentGoal,
  isGoalComplete,
} from './charter';
import { initialState } from './store';
import type { GameState } from './types';

function state(over: Partial<GameState> = {}): GameState {
  return { ...initialState(), ...over };
}

test('fresh game: first goal is Gather 40 Stone and nothing completes', () => {
  const s = state();
  const cur = getCurrentGoal(s);
  expect(cur!.goal.id).toBe('c1-gatherStone');
  expect(isGoalComplete(s, cur!.goal)).toBe(false);
  expect(applyCharterCompletions(s)).toBe(s);
  expect(getCompletedGoals(s)).toEqual([]);
});

test('goals complete strictly in order', () => {
  // Miner hired but stone spent below 15: the stone goal gates the miner goal.
  const s = state({ workers: { miner: 1, smith: 0, brewer: 0, scout: 0 } });
  s.resources.stone = 5;
  expect(applyCharterCompletions(s)).toBe(s);

  s.resources.stone = 40;
  const next = applyCharterCompletions(s);
  // Both complete in one pass: stone goal first, then the already-satisfied miner goal.
  expect(next.charterGoalsDone).toEqual(['c1-gatherStone', 'c1-hireMiner']);
  expect(getCurrentGoal(next)!.goal.id).toBe('c1-buildMineShaft');
});

test('chapter I cascade grants goal and chapter rewards', () => {
  const s = state({
    workers: { miner: 1, smith: 0, brewer: 0, scout: 0 },
    buildings: { ...initialState().buildings, mineShaft: 1 },
    depth: 30,
  });
  s.resources.stone = 40;
  const next = applyCharterCompletions(s);
  expect(next.charterGoalsDone).toEqual([
    'c1-gatherStone',
    'c1-hireMiner',
    'c1-buildMineShaft',
    'c1-reach25',
  ]);
  expect(next.resources.ale).toBe(30); // 20 + 10 mine-shaft goal reward
  expect(next.resources.stone).toBe(90); // 40 + 50 chapter reward
  // Chapter II starts, blocked on the brewery.
  expect(getCurrentGoal(next)!.goal.id).toBe('c2-buildBrewery');
});

test('rewards are granted once: re-applying is a no-op', () => {
  const s = state({ workers: { miner: 1, smith: 0, brewer: 0, scout: 0 } });
  s.resources.stone = 40;
  const once = applyCharterCompletions(s);
  const twice = applyCharterCompletions(once);
  expect(twice).toBe(once);
});

test('Keep Ale above 10 gates later depth goals', () => {
  const s = state({
    workers: { miner: 1, smith: 0, brewer: 1, scout: 0 },
    buildings: { ...initialState().buildings, mineShaft: 1, brewery: 1 },
    depth: 80,
    charterGoalsDone: ['c1-gatherStone', 'c1-hireMiner', 'c1-buildMineShaft', 'c1-reach25'],
  });
  s.resources.ale = 5; // below 10 — chapter II stalls here despite depth 80
  const next = applyCharterCompletions(s);
  expect(next.charterGoalsDone).toContain('c2-hireBrewer');
  expect(next.charterGoalsDone).not.toContain('c2-keepAle');
  expect(next.charterGoalsDone).not.toContain('c2-reach75');
  expect(getCurrentGoal(next)!.goal.id).toBe('c2-keepAle');
});

test('ale rewards are capped by storage', () => {
  const s = state({ workers: { miner: 1, smith: 0, brewer: 0, scout: 0 } });
  s.resources.stone = 40;
  s.resources.ale = 45; // storage 50 with no brewery; +10 goal reward would overflow
  s.buildings = { ...initialState().buildings, mineShaft: 1 };
  const next = applyCharterCompletions(s);
  expect(next.charterGoalsDone).toContain('c1-buildMineShaft');
  expect(next.resources.ale).toBe(50);
});

test('getCharterProgress reports current, next and counts', () => {
  const s = state();
  const p = getCharterProgress(s);
  expect(p.totalCount).toBe(30);
  expect(p.completedCount).toBe(0);
  expect(p.allComplete).toBe(false);
  expect(p.current!.goal.id).toBe('c1-gatherStone');
  expect(p.next!.goal.id).toBe('c1-hireMiner');
  expect(p.chapters).toHaveLength(7);
  expect(p.chapters[0].complete).toBe(false);
});

test('all goals done: progress reports allComplete', () => {
  const s = state();
  const p0 = getCharterProgress(s);
  s.charterGoalsDone = p0.chapters.flatMap((c) => c.goals.map((g) => g.goal.id));
  const p = getCharterProgress(s);
  expect(p.allComplete).toBe(true);
  expect(p.current).toBeNull();
  expect(getCurrentGoal(s)).toBeNull();
  expect(applyCharterCompletions(s)).toBe(s);
});
