import { expect, test } from 'vitest';
import { applyAwards, clearNewAwards, recordOfflineBest, recordSurveyCompletions } from './awards';
import { aleStorage, statMult, surveySpeedMult } from './economy';
import { initialState } from './store';
import { simulateTick } from './tick';

const NOW = 1_000_000_000;
const never = () => 1;

test('tick accumulates records and grants earned trophies', () => {
  const s = initialState();
  s.workers.brewer = 1;
  s.resources.ale = 20;
  const next = simulateTick(s, 10, NOW, never);
  expect(next.records.totalAleBrewed).toBeGreaterThan(1);
  expect(next.records.totalAleConsumed).toBeGreaterThan(0);
  expect(next.trophiesEarned).toContain('firstCask');
  expect(next.newAwards).toContainEqual({ type: 'trophy', id: 'firstCask' });
});

test('award conditions can discover artifacts without displaying them', () => {
  const s = initialState();
  s.records.totalAleBrewed = 500;
  const next = applyAwards(s);
  expect(next.trophiesEarned).toContain('masterBrewer');
  expect(next.artifactsFound).toContain('ancientTankard');
  expect(next.displayedArtifacts).toEqual([]);
  expect(next.newAwards).toContainEqual({ type: 'artifact', id: 'ancientTankard' });
});

test('displayed artifacts apply only while slotted', () => {
  const s = initialState();
  s.artifactsFound = ['ancientTankard', 'stonebeardCompass', 'firstHammerHead'];
  s.displayedArtifacts = ['ancientTankard', 'stonebeardCompass', 'firstHammerHead'];
  expect(aleStorage(s)).toBeCloseTo(55);
  expect(surveySpeedMult(s)).toBeCloseTo(1.1);
  expect(statMult(s, 'smelt', NOW)).toBeCloseTo(1.05);
});

test('new awards can be cleared by type', () => {
  const s = initialState();
  s.newAwards = [
    { type: 'trophy', id: 'firstCask' },
    { type: 'artifact', id: 'ancientTankard' },
    { type: 'record', id: 'bestOfflineYield' },
  ];
  const trophiesCleared = clearNewAwards(s, 'trophy');
  expect(trophiesCleared.newAwards).toEqual([
    { type: 'artifact', id: 'ancientTankard' },
    { type: 'record', id: 'bestOfflineYield' },
  ]);
  expect(clearNewAwards(trophiesCleared).newAwards).toEqual([]);
});

test('offline best record can unlock Night Cellar', () => {
  const s = initialState();
  const next = recordOfflineBest(s, { stone: 0, ore: 0, ingot: 0, gold: 0, gem: 0, ale: 60 });
  expect(next.records.bestOfflineYield.ale).toBe(60);
  expect(next.trophiesEarned).toContain('nightCellar');
  expect(next.newAwards).toContainEqual({ type: 'record', id: 'bestOfflineYield' });
});

test('survey completion records unlock compass awards', () => {
  const before = initialState();
  const after = { ...before, surveyBonuses: { iron: 'richVein' as const } };
  const next = recordSurveyCompletions(before, after);
  expect(next.records.surveysCompleted).toBe(1);
  expect(next.trophiesEarned).toContain('ironVeinsSurveyed');
  expect(next.artifactsFound).toContain('stonebeardCompass');
});
