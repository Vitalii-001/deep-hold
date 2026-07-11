import { beforeEach, expect, test } from 'vitest';
import { initialState, useGame } from './store';

beforeEach(() => {
  useGame.getState().hydrate(initialState());
});

function cheat(resources: Partial<Record<string, number>>) {
  const s = useGame.getState();
  s.hydrate({ ...initialState(), resources: { ...initialState().resources, ...resources } as never });
}

test('initial state matches config', () => {
  const s = useGame.getState();
  expect(s.resources.stone).toBe(0);
  expect(s.resources.ale).toBe(20);
  expect(s.depth).toBe(0);
  expect(s.workers.miner).toBe(0);
});

test('clickMine adds stone', () => {
  useGame.getState().clickMine();
  expect(useGame.getState().resources.stone).toBe(1);
});

test('hireWorker refuses when unaffordable, works when affordable', () => {
  useGame.getState().hireWorker('miner');
  expect(useGame.getState().workers.miner).toBe(0);
  cheat({ stone: 100 });
  useGame.getState().hireWorker('miner');
  expect(useGame.getState().workers.miner).toBe(1);
  expect(useGame.getState().resources.stone).toBe(85); // 100 - 15
});

test('hireWorker enforces cap (5 miners with no mine shaft)', () => {
  cheat({ stone: 1_000_000 });
  for (let i = 0; i < 10; i++) useGame.getState().hireWorker('miner');
  expect(useGame.getState().workers.miner).toBe(5);
});

test('buildBuilding enforces unlock depth', () => {
  cheat({ stone: 1_000_000 });
  useGame.getState().buildBuilding('brewery'); // unlocks at 25 m
  expect(useGame.getState().buildings.brewery).toBe(0);
  useGame.getState().hydrate({ ...useGame.getState(), depth: 25 });
  useGame.getState().buildBuilding('brewery');
  expect(useGame.getState().buildings.brewery).toBe(1);
});

test('buyUpgrade enforces required building and no double-buy', () => {
  const rich = { ...initialState(), depth: 500, resources: { stone: 1e9, ore: 0, ingot: 1e9, gold: 1e9, gem: 1e9, ale: 0 } };
  useGame.getState().hydrate(rich);
  useGame.getState().buyUpgrade('ironPicks'); // requires forge
  expect(useGame.getState().upgrades).toEqual([]);
  useGame.getState().hydrate({ ...useGame.getState(), buildings: { ...useGame.getState().buildings, forge: 1 } });
  useGame.getState().buyUpgrade('ironPicks');
  useGame.getState().buyUpgrade('ironPicks');
  expect(useGame.getState().upgrades).toEqual(['ironPicks']);
});

test('setDigMode and toggleMuted', () => {
  useGame.getState().setDigMode('reckless');
  expect(useGame.getState().digMode).toBe('reckless');
  useGame.getState().toggleMuted();
  expect(useGame.getState().muted).toBe(true);
});