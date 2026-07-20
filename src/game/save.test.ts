import { beforeEach, expect, test, vi } from 'vitest';
import { clearSave, hasMeaningfulProgress, loadGame, saveGame, SAVE_KEY } from './save';
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

test('future/unknown version returns null', () => {
  mem.set(SAVE_KEY, JSON.stringify({ version: 999, savedAt: 1, state: initialState() }));
  expect(loadGame()).toBeNull();
  mem.set(SAVE_KEY, JSON.stringify({ version: 0, savedAt: 1, state: initialState() }));
  expect(loadGame()).toBeNull();
});

test('v1 save migrates through the whole chain to the current version', () => {
  const v1 = { version: 1, savedAt: 7, state: { depth: 42, workers: { miner: 2 } } };
  mem.set(SAVE_KEY, JSON.stringify(v1));
  const loaded = loadGame();
  expect(loaded).not.toBeNull();
  expect(loaded!.state.depth).toBe(42);
  expect(loaded!.state.workers.miner).toBe(2);
  expect(loaded!.state.playedSec).toBe(0); // v2
  expect(loaded!.state.brewMode).toBe('thin'); // v3
  expect(loaded!.state.feastUntilSec).toBe(0);
  expect(loaded!.state.rallyReadyAtSec).toBe(0);
  expect(loaded!.state.miningMethod).toBe('balanced'); // v4
  expect(loaded!.state.surveyProgress).toEqual({});
  expect(loaded!.state.permanentBonuses).toEqual([]); // v5
  expect(loaded!.state.activeOrders).toEqual([]);
  expect(loaded!.state.ordersCompleted).toEqual([]); // v6
  expect(loaded!.state.expeditions).toEqual([]);
  expect(loaded!.state.trophiesEarned).toEqual([]); // v7
  expect(loaded!.state.artifactsFound).toEqual([]);
  expect(loaded!.state.displayedArtifacts).toEqual([]);
  expect(loaded!.state.newAwards).toEqual([]);
  expect(loaded!.state.records.totalAleBrewed).toBe(0);
});

test('v4 migration maps old digMode: reckless players keep their risk appetite', () => {
  const v1 = { version: 1, savedAt: 7, state: { depth: 42, digMode: 'reckless' } };
  mem.set(SAVE_KEY, JSON.stringify(v1));
  const loaded = loadGame();
  expect(loaded!.state.miningMethod).toBe('bulk');
  expect('digMode' in (loaded!.state as unknown as Record<string, unknown>)).toBe(false);
});

test('current-version roundtrip preserves playedSec', () => {
  const s = initialState();
  s.playedSec = 1234.5;
  s.records.totalAleBrewed = 77;
  s.records.bestOfflineYield = { stone: 120 };
  saveGame(s, 1);
  const loaded = loadGame()!.state;
  expect(loaded.playedSec).toBeCloseTo(1234.5);
  expect(loaded.records.totalAleBrewed).toBe(77);
  expect(loaded.records.bestOfflineYield.stone).toBe(120);
});

test('old save missing new fields is filled from initialState', () => {
  const partial = { version: 1, savedAt: 1, state: { depth: 42, resources: { stone: 10 } } };
  mem.set(SAVE_KEY, JSON.stringify(partial));
  const loaded = loadGame();
  expect(loaded!.state.depth).toBe(42);
  expect(loaded!.state.resources.stone).toBe(10);
  expect(loaded!.state.resources.ale).toBe(20); // filled from initialState
  expect(loaded!.state.miningMethod).toBe('balanced');
});

test('clearSave removes the entry', () => {
  saveGame(initialState(), 1);
  clearSave();
  expect(loadGame()).toBeNull();
});

test('charter and discovery fields roundtrip and default safely for old saves', () => {
  const s = initialState();
  s.charterGoalsDone = ['c1-gatherStone'];
  s.discoveriesSeen = ['buriedCart'];
  s.discoveryChoices = { buriedCart: 'salvage' };
  s.pendingDiscoveryId = 'coldSpring';
  saveGame(s, 1);
  const loaded = loadGame()!.state;
  expect(loaded.charterGoalsDone).toEqual(['c1-gatherStone']);
  expect(loaded.discoveriesSeen).toEqual(['buriedCart']);
  expect(loaded.discoveryChoices).toEqual({ buriedCart: 'salvage' });
  expect(loaded.pendingDiscoveryId).toBe('coldSpring');

  mem.clear();
  mem.set(SAVE_KEY, JSON.stringify({ version: 1, savedAt: 1, state: { depth: 300 } }));
  const old = loadGame()!.state;
  expect(old.charterGoalsDone).toEqual([]);
  expect(old.discoveriesSeen).toEqual([]);
  expect(old.discoveryChoices).toEqual({});
  expect(old.pendingDiscoveryId).toBeNull();
});

test('hasMeaningfulProgress: fresh state is false, any progress axis is true', () => {
  expect(hasMeaningfulProgress(initialState())).toBe(false);
  const dug = initialState();
  dug.depth = 1;
  expect(hasMeaningfulProgress(dug)).toBe(true);
  const hired = initialState();
  hired.workers.brewer = 1;
  expect(hasMeaningfulProgress(hired)).toBe(true);
  const built = initialState();
  built.buildings.temple = 1;
  expect(hasMeaningfulProgress(built)).toBe(true);
  const upgraded = initialState();
  upgraded.upgrades = ['sharpPicks'];
  expect(hasMeaningfulProgress(upgraded)).toBe(true);
});

test('onboarding roundtrips; old saves with progress skip the intro', () => {
  // explicit onboarding is preserved as-is
  const s = initialState();
  s.onboarding = { introSeen: true };
  saveGame(s, 1);
  expect(loadGame()!.state.onboarding.introSeen).toBe(true);

  // old save (no onboarding field) with progress: intro treated as seen
  mem.clear();
  mem.set(SAVE_KEY, JSON.stringify({ version: 1, savedAt: 1, state: { depth: 300 } }));
  expect(loadGame()!.state.onboarding.introSeen).toBe(true);

  // old save with no progress at all: intro still shows
  mem.clear();
  mem.set(SAVE_KEY, JSON.stringify({ version: 1, savedAt: 1, state: { muted: true } }));
  expect(loadGame()!.state.onboarding.introSeen).toBe(false);
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
