import { beforeEach, expect, test } from 'vitest';
import { initialState, useGame } from './store';
import { BALANCE } from '../config/balance';

beforeEach(() => {
  useGame.getState().hydrate(initialState());
});

function cheat(resources: Partial<Record<string, number>>) {
  const s = useGame.getState();
  s.hydrate({ ...initialState(), resources: { ...initialState().resources, ...resources } as never });
}

test('initial state matches config', () => {
  const s = useGame.getState();
  expect(s.resources.stone).toBe(15); // just enough to hire the first miner
  expect(s.resources.ale).toBe(20);
  expect(s.depth).toBe(0);
  expect(s.workers.miner).toBe(0);
});

test('hireWorker refuses when unaffordable, works when affordable', () => {
  cheat({ stone: 0 });
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

test('setMiningMethod and toggleMuted', () => {
  useGame.getState().setMiningMethod('bulk');
  expect(useGame.getState().miningMethod).toBe('bulk');
  useGame.getState().toggleMuted();
  expect(useGame.getState().muted).toBe(true);
});

test('initialState starts with no completed tutorial steps', () => {
  expect(initialState().tutorialDone).toEqual([]);
});

test('fresh game shows the intro; completeIntro and replayIntro toggle it', () => {
  expect(initialState().onboarding.introSeen).toBe(false);
  useGame.getState().completeIntro();
  expect(useGame.getState().onboarding.introSeen).toBe(true);
  useGame.getState().replayIntro();
  expect(useGame.getState().onboarding.introSeen).toBe(false);
});

test('chooseDiscovery applies the pending choice exactly once', () => {
  useGame.getState().hydrate({
    ...initialState(),
    depth: 15,
    pendingDiscoveryId: 'buriedCart',
    resources: { ...initialState().resources, stone: 0 },
  });
  useGame.getState().chooseDiscovery('nonsense'); // unknown option: ignored
  expect(useGame.getState().pendingDiscoveryId).toBe('buriedCart');
  useGame.getState().chooseDiscovery('salvage');
  expect(useGame.getState().resources.stone).toBe(25);
  expect(useGame.getState().pendingDiscoveryId).toBeNull();
  expect(useGame.getState().discoveryChoices).toEqual({ buriedCart: 'salvage' });
  useGame.getState().chooseDiscovery('salvage'); // no pending discovery: no-op
  expect(useGame.getState().resources.stone).toBe(25);
});

test('holdFeast: needs brewery, ale and an expired cooldown; grants the window', () => {
  const base = {
    ...initialState(),
    buildings: { ...initialState().buildings, brewery: 1 },
    playedSec: 100,
  };
  // no ale — refused
  useGame.getState().hydrate({ ...base, resources: { ...base.resources, ale: 10 } });
  useGame.getState().holdFeast();
  expect(useGame.getState().feastUntilSec).toBe(0);
  // affordable — fires and spends ale
  useGame.getState().hydrate({ ...base, resources: { ...base.resources, ale: 60 } });
  useGame.getState().holdFeast();
  const s = useGame.getState();
  expect(s.resources.ale).toBe(60 - BALANCE.feast.aleCost);
  expect(s.feastUntilSec).toBe(100 + BALANCE.feast.durationSec);
  expect(s.feastCooldownUntilSec).toBe(100 + BALANCE.feast.cooldownSec);
  // still cooling — second feast refused
  useGame.getState().holdFeast();
  expect(useGame.getState().resources.ale).toBe(60 - BALANCE.feast.aleCost);
});

test('rallyMiners grants stone with a floor and respects its cooldown', () => {
  useGame.getState().hydrate({ ...initialState(), playedSec: 10 });
  const before = useGame.getState().resources.stone;
  useGame.getState().rallyMiners(0);
  const after = useGame.getState().resources.stone;
  expect(after - before).toBeGreaterThanOrEqual(BALANCE.rally.baseStone);
  expect(useGame.getState().rallyReadyAtSec).toBe(10 + BALANCE.rally.cooldownSec);
  useGame.getState().rallyMiners(0); // cooling — no-op
  expect(useGame.getState().resources.stone).toBe(after);
});

test('setBrewMode switches the recipe', () => {
  expect(useGame.getState().brewMode).toBe('thin');
  useGame.getState().setBrewMode('stout');
  expect(useGame.getState().brewMode).toBe('stout');
});

test('hiring the first miner opens the shaft at 7 m; later hires never touch depth', () => {
  useGame.getState().hydrate(initialState());
  useGame.getState().hireWorker('miner');
  expect(useGame.getState().workers.miner).toBe(1);
  expect(useGame.getState().depth).toBe(BALANCE.dig.firstMinerShaftM);

  const deep = initialState();
  deep.depth = 50;
  deep.workers.miner = 1;
  deep.resources.stone = 1e6;
  useGame.getState().hydrate(deep);
  useGame.getState().hireWorker('miner');
  expect(useGame.getState().workers.miner).toBe(2);
  expect(useGame.getState().depth).toBe(50);
});

test('mineChunkClick rolls the reward in the store and applies it', () => {
  useGame.getState().hydrate({
    ...initialState(),
    resources: { ...initialState().resources, stone: 0 },
  });
  const reward = useGame.getState().mineChunkClick('dirt', 3, () => 0.99);
  expect(reward.stone).toBeGreaterThan(0);
  expect(useGame.getState().resources.stone).toBe(reward.stone);
});

test('claimChunkFind records a find, bumps the counter, and flags a new award', () => {
  useGame.getState().hydrate(initialState());
  const find = useGame.getState().claimChunkFind('iron', () => 0); // low roll → guaranteed drop
  expect(find).not.toBeNull();
  expect(useGame.getState().findsCollected).toContain(find!.id);
  expect(useGame.getState().records.totalFindsCollected).toBe(1);
  expect(useGame.getState().newAwards.some((a) => a.type === 'find' && a.id === find!.id)).toBe(true);
});

test('sellResource banks crowns and buyMarketPerk spends them via the store', () => {
  useGame.getState().hydrate({
    ...initialState(),
    depth: 100,
    resources: { ...initialState().resources, gem: 10 },
  });
  useGame.getState().sellResource('gem', 10);
  expect(useGame.getState().resources.gem).toBe(0);
  const earned = useGame.getState().crowns;
  expect(earned).toBeGreaterThan(0);

  useGame.getState().buyMarketPerk('deepCellar');
  expect(useGame.getState().marketPerks).toContain('deepCellar');
  expect(useGame.getState().crowns).toBeLessThan(earned);
  expect(useGame.getState().permanentBonuses).toContain('deepCellar');
});

test('claimChunkFind returns null and changes nothing on a missed roll', () => {
  useGame.getState().hydrate(initialState());
  const find = useGame.getState().claimChunkFind('iron', () => 0.999);
  expect(find).toBeNull();
  expect(useGame.getState().findsCollected).toEqual([]);
  expect(useGame.getState().records.totalFindsCollected).toBe(0);
});

test('mineChunkClick clamps totalClicks and falls back to the face layer on bad ids', () => {
  useGame.getState().hydrate({
    ...initialState(),
    resources: { ...initialState().resources, stone: 0 },
  });
  // totalClicks=0 would explode the per-click share — must be clamped into range
  const cheat = useGame.getState().mineChunkClick('gems', 0, () => 0.99);
  expect(cheat.stone).toBeLessThanOrEqual(BALANCE.mineInteractions.rewardMaxStone);
  // unknown layer id → face layer (dirt at depth 0 → stone only)
  const fallback = useGame.getState().mineChunkClick('nope', 3, () => 0);
  expect(Object.keys(fallback)).toEqual(['stone']);
});

test('completeTutorialStep records an id exactly once (idempotent)', () => {
  useGame.getState().hydrate(initialState());
  useGame.getState().completeTutorialStep('clickMine');
  useGame.getState().completeTutorialStep('clickMine');
  useGame.getState().completeTutorialStep('hireMiner');
  expect(useGame.getState().tutorialDone).toEqual(['clickMine', 'hireMiner']);
});

test('toggleDisplayedArtifact enforces found artifacts and three display slots', () => {
  useGame.getState().hydrate({
    ...initialState(),
    artifactsFound: ['ancientTankard', 'stonebeardCompass', 'firstHammerHead'],
  });
  useGame.getState().toggleDisplayedArtifact('unknown');
  expect(useGame.getState().displayedArtifacts).toEqual([]);
  useGame.getState().toggleDisplayedArtifact('ancientTankard');
  useGame.getState().toggleDisplayedArtifact('stonebeardCompass');
  useGame.getState().toggleDisplayedArtifact('firstHammerHead');
  expect(useGame.getState().displayedArtifacts).toEqual(['ancientTankard', 'stonebeardCompass', 'firstHammerHead']);
  useGame.getState().toggleDisplayedArtifact('ancientTankard');
  expect(useGame.getState().displayedArtifacts).toEqual(['stonebeardCompass', 'firstHammerHead']);
});
