import { expect, test } from 'vitest';
import { getAleForecast, getMiningForecast, getNextBestActions } from './forecast';
import { productionRates } from './economy';
import { initialState } from './store';
import { BALANCE } from '../config/balance';
import { WORKERS } from '../config/workers';
import { BREW_MODES } from '../config/brewModes';
import type { GameState } from './types';

const NOW = 1_000_000_000;

function state(over: Partial<GameState> = {}): GameState {
  return { ...initialState(), ...over };
}

test('idle hold: no workers, zero rates, no timers', () => {
  const f = getAleForecast(state(), NOW);
  expect(f.moraleState).toBe('idle');
  expect(f.workers).toBe(0);
  expect(f.netAle).toBe(0);
  expect(f.timeToDry).toBeNull();
  expect(f.timeToFull).toBeNull();
  expect(f.recommendedBrewers).toBe(0);
});

test('miners only: draining, time-to-dry and a brewer recommendation', () => {
  const s = state({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  const f = getAleForecast(s, NOW);
  const expectedDrink = 5 * BALANCE.ale.consumptionPerWorker;
  expect(f.moraleState).toBe('merry'); // 20/50 = 40% — above the thirsty band
  expect(f.drinkRate).toBeCloseTo(expectedDrink);
  expect(f.brewRate).toBe(0);
  expect(f.netAle).toBeCloseTo(-expectedDrink);
  expect(f.timeToDry).toBeCloseTo(s.resources.ale / expectedDrink);
  expect(f.timeToFull).toBeNull();
  expect(f.recommendedBrewers).toBeGreaterThanOrEqual(1);
});

test('recommendation accounts for the new brewer drinking too', () => {
  const s = state({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  const f = getAleForecast(s, NOW);
  // adding the recommended brewers must actually flip net non-negative
  const s2 = state({ workers: { ...s.workers, brewer: f.recommendedBrewers } });
  expect(getAleForecast(s2, NOW).netAle).toBeGreaterThanOrEqual(0);
});

test('brewers filling: brew-mode rate, time-to-full, no dry timer', () => {
  const s = state({ workers: { miner: 1, smith: 0, brewer: 1, scout: 0 } });
  const f = getAleForecast(s, NOW);
  const drink = 2 * BALANCE.ale.consumptionPerWorker;
  const brew = WORKERS.brewer.baseRate * BREW_MODES.thin.brewRateMult * BALANCE.ale.happyMult;
  expect(f.netAle).toBeCloseTo(brew - drink);
  expect(f.timeToDry).toBeNull();
  expect(f.timeToFull).toBeCloseTo((f.storage - s.resources.ale) / f.netAle);
  expect(f.recommendedBrewers).toBe(0);
});

test('dry hold: dry morale, but brewers keep at least normal pace', () => {
  const s = state({ workers: { miner: 10, smith: 0, brewer: 1, scout: 0 } });
  s.resources.ale = 0;
  const f = getAleForecast(s, NOW);
  expect(f.moraleState).toBe('dry');
  expect(f.moraleMult).toBe(BALANCE.ale.strikeMult);
  // immunity: brew rate at x1.0 morale, not the strike multiplier
  expect(f.brewRate).toBeCloseTo(WORKERS.brewer.baseRate * BREW_MODES.thin.brewRateMult);
});

test('thirsty band reports the gradient multiplier', () => {
  const s = state({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 5; // 10% of 50 storage — inside the 25% thirsty band
  const f = getAleForecast(s, NOW);
  expect(f.moraleState).toBe('thirsty');
  const t = 0.1 / BALANCE.ale.thirstyRatio;
  expect(f.moraleMult).toBeCloseTo(
    BALANCE.ale.strikeMult + (BALANCE.ale.happyMult - BALANCE.ale.strikeMult) * t,
  );
});

test('next best actions prioritize ready return timers', () => {
  const s = state({ expeditions: [{ templateId: 'stoutBatch', remainingSec: 0 }] });
  const actions = getNextBestActions(s, NOW);
  expect(actions[0].id).toBe('expedition:stoutBatch');
  expect(actions[0].title).toContain('Claim');
});

test('getMiningForecast mirrors economy rates and labels hardness', () => {
  const s = state({ depth: 100, workers: { miner: 3, smith: 0, brewer: 0, scout: 0 } });
  const f = getMiningForecast(s, NOW);
  const rates = productionRates(s, NOW);
  expect(f.layer.id).toBe('iron');
  expect(f.nextLayer?.id).toBe('coal');
  expect(f.method.id).toBe('balanced');
  expect(f.hardness).toBe(f.layer.hardness);
  expect(f.hardnessLabel).toBe('Firm'); // iron 3.2 -> Firm bucket
  expect(f.stoneRate).toBeCloseTo(rates.mining);
  expect(f.digSpeed).toBeCloseTo(rates.dig);
  expect(f.secondaryRates.ore).toBeCloseTo(rates.secondary.ore ?? 0);
  expect(f.moraleState).toBe('merry');
});

test('getMiningForecast hardness buckets span the layer list', () => {
  expect(getMiningForecast(state(), NOW).hardnessLabel).toBe('Soft'); // topsoil 1
  expect(getMiningForecast(state({ depth: 210 }), NOW).hardnessLabel).toBe('Tough'); // gold 7.5
  expect(getMiningForecast(state({ depth: 720 }), NOW).hardnessLabel).toBe('Brutal'); // obsidian 36
});
