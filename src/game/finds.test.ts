import { expect, test } from 'vitest';
import { completedLayerSetBonuses, findsOfLayer, rarityWeight, rollFind } from './finds';
import { FINDS, LAYER_SET_BONUSES } from '../config/finds';
import { LAYERS } from '../config/layers';
import { BALANCE } from '../config/balance';

const ironFinds = findsOfLayer('iron').map((f) => f.id);

test('every find points at a real layer and ids are unique', () => {
  const layerIds = new Set(LAYERS.map((l) => l.id));
  const seen = new Set<string>();
  for (const f of FINDS) {
    expect(layerIds.has(f.layerId)).toBe(true);
    expect(seen.has(f.id)).toBe(false);
    seen.add(f.id);
  }
});

test('every set bonus targets a layer that actually has finds', () => {
  for (const b of LAYER_SET_BONUSES) {
    expect(findsOfLayer(b.layerId).length).toBeGreaterThan(0);
  }
});

test('rarer finds carry less drop weight', () => {
  expect(rarityWeight('common')).toBeGreaterThan(rarityWeight('rare'));
  expect(rarityWeight('rare')).toBeGreaterThan(rarityWeight('legendary'));
});

test('rollFind returns null when the roll misses the drop chance', () => {
  expect(rollFind('iron', [], () => 0.999)).toBeNull();
});

test('rollFind drops an uncollected find of the layer on a low roll', () => {
  const find = rollFind('iron', [], () => 0);
  expect(find).not.toBeNull();
  expect(ironFinds).toContain(find!.id);
});

test('rollFind never returns an already-collected find', () => {
  const first = rollFind('iron', [], () => 0)!;
  const second = rollFind('iron', [first.id], () => 0)!;
  expect(second.id).not.toBe(first.id);
  expect(ironFinds).toContain(second.id);
});

test('rollFind returns null once the layer is exhausted', () => {
  expect(rollFind('iron', ironFinds, () => 0)).toBeNull();
});

test('the first-find boost makes an empty layer drop where a partial one would not', () => {
  const cfg = BALANCE.finds;
  // a roll between the boosted and base chance: drops when nothing collected,
  // misses once the layer already has one
  const between = (cfg.dropChancePerChunk + cfg.dropChancePerChunk * cfg.firstFindBoost) / 2;
  expect(rollFind('iron', [], () => between)).not.toBeNull();
  expect(rollFind('iron', [ironFinds[0]], () => between)).toBeNull();
});

test('completedLayerSetBonuses only fires on a fully collected layer', () => {
  expect(completedLayerSetBonuses([]).length).toBe(0);
  expect(completedLayerSetBonuses(ironFinds.slice(0, 1)).length).toBe(0);
  const bonuses = completedLayerSetBonuses(ironFinds);
  expect(bonuses.map((b) => b.layerId)).toContain('iron');
});
