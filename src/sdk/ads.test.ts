import { beforeEach, expect, test } from 'vitest';
import { showRewardedAd } from './ads';
import { initialState, useGame } from '../game/store';
import { BALANCE } from '../config/balance';
import { statMult } from '../game/economy';

beforeEach(() => {
  useGame.getState().hydrate(initialState());
});

test('stub ad always rewards', async () => {
  await expect(showRewardedAd()).resolves.toBe('rewarded');
});

test('claimBlessing doubles production for 4 hours', () => {
  const now = 1_000_000;
  useGame.getState().claimBlessing(now);
  const s = useGame.getState();
  expect(s.blessingUntil).toBe(now + BALANCE.blessing.durationHours * 3600 * 1000);
  expect(statMult(s, 'mining', now)).toBeCloseTo(BALANCE.blessing.mult);
  expect(statMult(s, 'mining', s.blessingUntil + 1)).toBeCloseTo(1); // expired
});

test('claimAleBarrel adds ale up to storage cap', () => {
  useGame.getState().claimAleBarrel();
  expect(useGame.getState().resources.ale).toBe(50); // 20 + 50 capped at 50 storage
});
