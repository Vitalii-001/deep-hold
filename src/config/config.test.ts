import { expect, test } from 'vitest';
import { LAYERS, layerAtDepth } from './layers';
import { MILESTONES } from './milestones';
import { UPGRADE_LIST, UPGRADES } from './upgrades';
import { WORKERS } from './workers';
import { BUILDINGS } from './buildings';

const RESOURCE_IDS = ['stone', 'ore', 'ingot', 'gold', 'gem', 'ale'];

test('layers start at 0 and are sorted by depth', () => {
  expect(LAYERS[0].depth).toBe(0);
  for (let i = 1; i < LAYERS.length; i++) {
    expect(LAYERS[i].depth).toBeGreaterThan(LAYERS[i - 1].depth);
  }
  expect(LAYERS).toHaveLength(6);
});

test('layerAtDepth picks the deepest layer at or above the given depth', () => {
  expect(layerAtDepth(0).id).toBe('dirt');
  expect(layerAtDepth(24.9).id).toBe('dirt');
  expect(layerAtDepth(25).id).toBe('stone');
  expect(layerAtDepth(99999).id).toBe('ruins');
});

test('milestones are sorted and unique', () => {
  const ids = MILESTONES.map((m) => m.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (let i = 1; i < MILESTONES.length; i++) {
    expect(MILESTONES[i].depth).toBeGreaterThan(MILESTONES[i - 1].depth);
  }
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

test('workers and buildings have valid costs and growth', () => {
  for (const w of Object.values(WORKERS)) {
    expect(w.costGrowth).toBeGreaterThan(1);
    expect(w.baseRate).toBeGreaterThan(0);
    for (const key of Object.keys(w.baseCost)) expect(RESOURCE_IDS).toContain(key);
  }
  expect(Object.keys(BUILDINGS)).toHaveLength(6);
  for (const b of Object.values(BUILDINGS)) {
    expect(b.costGrowth).toBeGreaterThan(1);
    expect(b.maxLevel).toBeGreaterThan(0);
    for (const key of Object.keys(b.baseCost)) expect(RESOURCE_IDS).toContain(key);
  }
});
