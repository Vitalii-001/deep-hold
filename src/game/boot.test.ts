import { beforeEach, expect, test, vi } from 'vitest';
import { bootGame, resetGame } from './boot';
import { loadGame, saveGame } from './save';
import { initialState, useGame } from './store';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
});

beforeEach(() => {
  mem.clear();
  useGame.getState().hydrate(initialState());
});

test('no save: fresh game, no summary', () => {
  expect(bootGame(1000)).toBeNull();
  expect(useGame.getState().resources.stone).toBe(15); // fresh-game starting stone
});

test('recent save (< 60s away): hydrates without offline sim', () => {
  const s = initialState();
  s.resources.stone = 500;
  saveGame(s, 100_000);
  const summary = bootGame(100_000 + 30_000); // 30s later
  expect(summary).toBeNull();
  expect(useGame.getState().resources.stone).toBe(500);
});

test('resetGame wipes the save and restores a fresh in-memory state', () => {
  const s = initialState();
  s.resources.stone = 999;
  s.depth = 300;
  saveGame(s, 100_000);
  useGame.getState().hydrate(s);
  resetGame();
  expect(loadGame()).toBeNull();
  expect(useGame.getState().resources.stone).toBe(15); // fresh state, starting stone
  expect(useGame.getState().depth).toBe(0);
  // a fresh run gets the intro again
  expect(useGame.getState().onboarding.introSeen).toBe(false);
});

test('long absence: offline sim runs and summary is returned', () => {
  const s = initialState();
  s.workers.miner = 2;
  s.resources.ale = 1e9;
  saveGame(s, 100_000);
  const summary = bootGame(100_000 + 3600 * 1000); // 1h later
  expect(summary).not.toBeNull();
  expect(summary!.gained.stone).toBeGreaterThan(0);
  expect(useGame.getState().resources.stone).toBeGreaterThan(0);
});
