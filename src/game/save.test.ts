import { beforeEach, expect, test, vi } from 'vitest';
import { clearSave, loadGame, saveGame, SAVE_KEY } from './save';
import { initialState } from './store';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
});

beforeEach(() => mem.clear());

test('roundtrip preserves game state', () => {
  const s = initialState();
  s.resources.stone = 123.45;
  s.workers.miner = 3;
  s.depth = 77;
  s.upgrades = ['sharpPicks'];
  saveGame(s, 5000);
  const loaded = loadGame();
  expect(loaded).not.toBeNull();
  expect(loaded!.savedAt).toBe(5000);
  expect(loaded!.state.resources.stone).toBeCloseTo(123.45);
  expect(loaded!.state.workers.miner).toBe(3);
  expect(loaded!.state.upgrades).toEqual(['sharpPicks']);
});

test('save strips non-GameState keys (store actions)', () => {
  const dirty = { ...initialState(), clickMine: () => {}, extraJunk: 42 };
  saveGame(dirty as never, 1);
  const raw = JSON.parse(mem.get(SAVE_KEY)!);
  expect(raw.state.clickMine).toBeUndefined();
  expect(raw.state.extraJunk).toBeUndefined();
});

test('missing or corrupt save returns null', () => {
  expect(loadGame()).toBeNull();
  mem.set(SAVE_KEY, 'not json {{{');
  expect(loadGame()).toBeNull();
});

test('wrong version returns null', () => {
  mem.set(SAVE_KEY, JSON.stringify({ version: 999, savedAt: 1, state: initialState() }));
  expect(loadGame()).toBeNull();
});

test('old save missing new fields is filled from initialState', () => {
  const partial = { version: 1, savedAt: 1, state: { depth: 42, resources: { stone: 10 } } };
  mem.set(SAVE_KEY, JSON.stringify(partial));
  const loaded = loadGame();
  expect(loaded!.state.depth).toBe(42);
  expect(loaded!.state.resources.stone).toBe(10);
  expect(loaded!.state.resources.ale).toBe(20); // filled from initialState
  expect(loaded!.state.digMode).toBe('careful');
});

test('clearSave removes the entry', () => {
  saveGame(initialState(), 1);
  clearSave();
  expect(loadGame()).toBeNull();
});

test('tutorialDone roundtrips and defaults to [] for old saves', () => {
  const s = initialState();
  s.tutorialDone = ['clickMine', 'hireMiner'];
  saveGame(s, 1);
  expect(loadGame()!.state.tutorialDone).toEqual(['clickMine', 'hireMiner']);

  mem.clear();
  mem.set(SAVE_KEY, JSON.stringify({ version: 1, savedAt: 1, state: { depth: 300 } }));
  expect(loadGame()!.state.tutorialDone).toEqual([]);
});
