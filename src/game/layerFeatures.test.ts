import { expect, test } from 'vitest';
import {
  aleSeepPerSec,
  chunkMaxActiveBonus,
  chunkRewardMult,
  findDropMult,
} from './layerFeatures';
import { rollChunkClickReward } from './mineInteractions';
import { rollFind } from './finds';
import { simulateTick } from './tick';
import { initialState } from './store';
import { layerAtDepth } from '../config/layers';
import type { GameState } from './types';

function state(over: Partial<GameState> = {}): GameState {
  const s = { ...initialState(), ...over };
  s.resources = { ...s.resources };
  return s;
}

test('accessors return the feature value on its layer and a neutral default elsewhere', () => {
  expect(aleSeepPerSec('mushroom')).toBeGreaterThan(0);
  expect(aleSeepPerSec('iron')).toBe(0);
  expect(chunkRewardMult('gold')).toBeGreaterThan(1);
  expect(chunkRewardMult('stone')).toBe(1);
  expect(chunkMaxActiveBonus('iron')).toBeGreaterThan(0);
  expect(chunkMaxActiveBonus('gold')).toBe(0);
  expect(findDropMult('gems')).toBeGreaterThan(1);
  expect(findDropMult('iron')).toBe(1);
});

test('Gold Seams (richChunks) pays a fatter chunk reward than a plain layer', () => {
  const s = state({
    workers: { miner: 100, smith: 0, brewer: 0, scout: 0 },
    upgrades: ['sharpPicks', 'oreCarts', 'ironPicks'],
  });
  s.resources.ale = 1e9;
  const plain = rollChunkClickReward(s, layerAtDepth(100), 5, () => 0.99); // iron: no richChunks
  const gold = rollChunkClickReward(s, layerAtDepth(200), 5, () => 0.99); // gold: richChunks
  expect(gold.stone!).toBeGreaterThan(plain.stone!);
});

test('Gem Hollows (findRich) drops a find where a plain layer would miss', () => {
  const gemFinds = ['amethystDruse']; // one already collected → isolates the rich multiplier from firstFindBoost
  // rng between the plain (0.12) and gem (0.24) drop chances
  expect(rollFind('gems', gemFinds, () => 0.2)).not.toBeNull();
  expect(rollFind('iron', ['ironTrilobite'], () => 0.2)).toBeNull();
});

test('Mushroom Grotto (aleSeep) trickles ale into the cellar with no brewers', () => {
  const s = state({ depth: 50, workers: { miner: 0, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 10;
  const next = simulateTick(s, 10, 1_000_000_000, () => 1);
  expect(next.resources.ale).toBeGreaterThan(10); // seep only; no workers drinking
});
