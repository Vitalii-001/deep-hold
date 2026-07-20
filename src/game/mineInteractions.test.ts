import { expect, test } from 'vitest';
import { chunkResource, hotspotLabel, rollChunkClicks, rollChunkClickReward } from './mineInteractions';
import { initialState } from './store';
import { BALANCE } from '../config/balance';
import { layerAtDepth } from '../config/layers';
import type { GameState } from './types';

function state(over: Partial<GameState> = {}): GameState {
  return { ...initialState(), ...over };
}

test('hotspot label follows the layer flavor', () => {
  expect(hotspotLabel(layerAtDepth(0))).toBe('Loose Stone');
  expect(hotspotLabel(layerAtDepth(80))).toBe('Ore Chunk');
  expect(hotspotLabel(layerAtDepth(210))).toBe('Gold Spark');
  expect(hotspotLabel(layerAtDepth(460))).toBe('Gem Crack');
});

test('chunk resource is the rarest secondary of the layer, stone otherwise', () => {
  expect(chunkResource(layerAtDepth(0))).toBe('stone');
  expect(chunkResource(layerAtDepth(80))).toBe('ore');
  expect(chunkResource(layerAtDepth(210))).toBe('gold');
  expect(chunkResource(layerAtDepth(460))).toBe('gem');
});

test('rollChunkClicks stays inside the configured range', () => {
  const cfg = BALANCE.mineInteractions;
  expect(rollChunkClicks(() => 0)).toBe(cfg.clicksMin);
  expect(rollChunkClicks(() => 0.999)).toBe(cfg.clicksMax);
  for (let i = 0; i < 20; i += 1) {
    const n = rollChunkClicks(Math.random);
    expect(n).toBeGreaterThanOrEqual(cfg.clicksMin);
    expect(n).toBeLessThanOrEqual(cfg.clicksMax);
  }
});

test('per-click reward has a floor with no miners and never goes negative', () => {
  const reward = rollChunkClickReward(state(), layerAtDepth(0), 5, () => 0.99);
  expect(reward.stone).toBeGreaterThanOrEqual(1);
  for (const v of Object.values(reward)) expect(v).toBeGreaterThan(0);
});

test('total across clicks stays within the old hotspot cap', () => {
  const s = state({
    workers: { miner: 100, smith: 0, brewer: 0, scout: 0 },
    upgrades: ['sharpPicks', 'oreCarts', 'ironPicks'],
    buildings: { ...initialState().buildings, forge: 10 },
  });
  s.resources.ale = 1e9;
  const clicks = BALANCE.mineInteractions.clicksMin;
  const perClick = rollChunkClickReward(s, layerAtDepth(0), clicks, () => 0.99);
  expect(perClick.stone! * clicks).toBeLessThanOrEqual(
    BALANCE.mineInteractions.rewardMaxStone + clicks, // rounding slack of ≤1 per click
  );
});

test('secondary drop comes from the passed layer, not the face layer', () => {
  const s = state({ depth: 500, workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  const ironLayer = layerAtDepth(100); // chunk sits higher than the face
  const withSecondary = rollChunkClickReward(s, ironLayer, 3, () => 0); // rng under secondaryChance
  expect(withSecondary.ore).toBeGreaterThanOrEqual(1);
  expect(withSecondary.gem).toBeUndefined(); // gem belongs to the face layer, not the chunk layer

  const without = rollChunkClickReward(s, ironLayer, 3, () => 0.99);
  expect(without.ore).toBeUndefined();

  const topsoil = rollChunkClickReward(state(), layerAtDepth(0), 3, () => 0);
  expect(Object.keys(topsoil)).toEqual(['stone']);
});
