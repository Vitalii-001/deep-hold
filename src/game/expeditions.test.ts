import { expect, test } from 'vitest';
import { initialState } from './store';
import {
  claimExpedition,
  rushExpedition,
  startExpedition,
  tickExpeditions,
} from './expeditions';

test('stout batch starts after Brewery, spends ale, and counts down', () => {
  const s = initialState();
  s.buildings.brewery = 1;
  s.resources.ale = 40;
  const started = startExpedition(s, 'stoutBatch');
  expect(started.resources.ale).toBe(20);
  expect(started.expeditions).toEqual([{ templateId: 'stoutBatch', remainingSec: 1800, targetLayerId: undefined }]);
  const ticked = tickExpeditions(started, 300);
  expect(ticked.expeditions[0].remainingSec).toBe(1500);
});

test('ready stout batch claims ale up to storage cap', () => {
  const s = initialState();
  s.buildings.brewery = 1;
  s.resources.ale = 10;
  s.expeditions = [{ templateId: 'stoutBatch', remainingSec: 0 }];
  const next = claimExpedition(s, 'stoutBatch');
  expect(next.resources.ale).toBe(90);
  expect(next.expeditions).toEqual([]);
});

test('scout expedition locks target layer and claims a survey bonus', () => {
  const s = initialState();
  s.workers.scout = 1;
  s.depth = 76; // next layer is Coal Seams
  const started = startExpedition(s, 'scoutReport');
  expect(started.expeditions[0].targetLayerId).toBe('coal');
  const ready = { ...started, expeditions: [{ ...started.expeditions[0], remainingSec: 0 }] };
  const next = claimExpedition(ready, 'scoutReport', () => 0);
  expect(next.surveyProgress.coal).toBe(100);
  expect(next.surveyBonuses.coal).toBe('richVein');
});

test('rushExpedition can spend supplies or skip cost for rewarded-ad slots', () => {
  const s = initialState();
  s.buildings.brewery = 1;
  s.resources.ale = 40;
  s.resources.stone = 200;
  const started = startExpedition(s, 'stoutBatch');
  const paid = rushExpedition(started, 'stoutBatch', 300);
  expect(paid.resources.stone).toBe(80);
  expect(paid.expeditions[0].remainingSec).toBe(1500);
  const ad = rushExpedition(paid, 'stoutBatch', 900, null);
  expect(ad.resources.stone).toBe(80);
  expect(ad.expeditions[0].remainingSec).toBe(600);
});
