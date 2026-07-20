import { expect, test } from 'vitest';
import { LAYERS, layerAtDepth } from './layers';
import { MILESTONES } from './milestones';
import { UPGRADE_LIST, UPGRADES } from './upgrades';
import { WORKERS } from './workers';
import { BUILDINGS } from './buildings';
import { CHARTER, CHARTER_GOAL_COUNT, findCharterGoal } from './charter';
import { MINING_METHODS } from './miningMethods';
import { ROYAL_STEWARD_GREETING } from './intro';
import { DISCOVERIES, DISCOVERY_MAP } from './discoveries';
import { initialState } from '../game/store';

const RESOURCE_IDS = ['stone', 'ore', 'ingot', 'gold', 'gem', 'ale'];

test('layers start at 0, sorted by depth, with valid hardness/hazard/yields', () => {
  expect(LAYERS[0].depth).toBe(0);
  for (let i = 1; i < LAYERS.length; i++) {
    expect(LAYERS[i].depth).toBeGreaterThan(LAYERS[i - 1].depth);
  }
  expect(LAYERS).toHaveLength(10);
  for (const l of LAYERS) {
    expect(l.hardness).toBeGreaterThanOrEqual(1);
    expect(l.hazard).toBeGreaterThan(0);
    for (const key of Object.keys(l.baseYield)) expect(RESOURCE_IDS).toContain(key);
  }
});

test('mining methods: balanced is the neutral baseline, bulk carries the risk', () => {
  expect(MINING_METHODS.balanced).toMatchObject({ stoneMult: 1, secondaryMult: 1, digMult: 1, aleMult: 1, caveInMult: 0 });
  expect(MINING_METHODS.selective.secondaryMult).toBeGreaterThan(1);
  expect(MINING_METHODS.selective.caveInMult).toBe(0);
  expect(MINING_METHODS.bulk.caveInMult).toBeGreaterThan(0);
  expect(MINING_METHODS.bulk.aleMult).toBeGreaterThan(1);
});

test('layerAtDepth picks the deepest layer at or above the given depth', () => {
  expect(layerAtDepth(0).id).toBe('dirt');
  expect(layerAtDepth(24.9).id).toBe('dirt');
  expect(layerAtDepth(25).id).toBe('stone');
  expect(layerAtDepth(99999).id).toBe('ruins');
});

test('milestones are sorted, unique, and grant a production bonus', () => {
  const ids = MILESTONES.map((m) => m.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (let i = 1; i < MILESTONES.length; i++) {
    expect(MILESTONES[i].depth).toBeGreaterThan(MILESTONES[i - 1].depth);
  }
  for (const m of MILESTONES) expect(m.mult).toBeGreaterThan(1);
});

test('spec requires 20-25 upgrades with unique ids and valid costs', () => {
  expect(UPGRADE_LIST.length).toBeGreaterThanOrEqual(20);
  expect(UPGRADE_LIST.length).toBeLessThanOrEqual(25);
  const ids = UPGRADE_LIST.map((u) => u.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const u of UPGRADE_LIST) {
    expect(u.mult).toBeGreaterThan(1);
    for (const key of Object.keys(u.cost)) expect(RESOURCE_IDS).toContain(key);
    expect(UPGRADES[u.id]).toBe(u);
  }
});

test('royal steward greeting is present and addresses the King', () => {
  expect(ROYAL_STEWARD_GREETING.speaker).toBe('Royal Steward');
  expect(ROYAL_STEWARD_GREETING.body.length).toBeGreaterThan(0);
  expect(ROYAL_STEWARD_GREETING.body).toContain('My King');
});

test('charter has unique goal ids, positive targets and valid rewards', () => {
  const s = initialState();
  const ids = CHARTER.flatMap((ch) => ch.goals.map((g) => g.id));
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.length).toBe(CHARTER_GOAL_COUNT);
  for (const ch of CHARTER) {
    expect(ch.goals.length).toBeGreaterThan(0);
    for (const key of Object.keys(ch.reward ?? {})) expect(RESOURCE_IDS).toContain(key);
    for (const g of ch.goals) {
      const { current, target } = g.progress(s);
      expect(target).toBeGreaterThan(0);
      expect(current).toBeGreaterThanOrEqual(0);
      for (const key of Object.keys(g.reward ?? {})) expect(RESOURCE_IDS).toContain(key);
      expect(findCharterGoal(g.id)!.goal).toBe(g);
    }
  }
  expect(findCharterGoal('no-such-goal')).toBeNull();
});

test('discoveries are unique, depth-sorted, with valid options', () => {
  const ids = DISCOVERIES.map((d) => d.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (let i = 1; i < DISCOVERIES.length; i++) {
    expect(DISCOVERIES[i].depth).toBeGreaterThan(DISCOVERIES[i - 1].depth);
  }
  for (const d of DISCOVERIES) {
    expect(DISCOVERY_MAP[d.id]).toBe(d);
    expect(d.options.length).toBeGreaterThanOrEqual(2);
    const optIds = d.options.map((o) => o.id);
    expect(new Set(optIds).size).toBe(optIds.length);
    for (const o of d.options) {
      for (const key of Object.keys(o.gain ?? {})) expect(RESOURCE_IDS).toContain(key);
      for (const key of Object.keys(o.cost ?? {})) expect(RESOURCE_IDS).toContain(key);
      if (o.caveInChance !== undefined) {
        expect(o.caveInChance).toBeGreaterThan(0);
        expect(o.caveInChance).toBeLessThanOrEqual(1);
      }
      expect(o.toast.length).toBeGreaterThan(0);
    }
  }
});

test('workers and buildings have valid costs and growth', () => {
  for (const w of Object.values(WORKERS)) {
    expect(w.costGrowth).toBeGreaterThan(1);
    expect(w.baseRate).toBeGreaterThan(0);
    for (const key of Object.keys(w.baseCost)) expect(RESOURCE_IDS).toContain(key);
  }
  expect(Object.keys(BUILDINGS)).toHaveLength(7);
  for (const b of Object.values(BUILDINGS)) {
    expect(b.costGrowth).toBeGreaterThan(1);
    expect(b.maxLevel).toBeGreaterThan(0);
    for (const key of Object.keys(b.baseCost)) expect(RESOURCE_IDS).toContain(key);
  }
});
