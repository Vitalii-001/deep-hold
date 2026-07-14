import { expect, test } from 'vitest';
import { useUi } from './uiStore';

test('activePanel defaults to workers and can be switched', () => {
  expect(useUi.getState().activePanel).toBe('workers');
  useUi.getState().setActivePanel('buildings');
  expect(useUi.getState().activePanel).toBe('buildings');
  useUi.getState().setActivePanel('workers');
});

test('creditsOpen defaults to false and toggles', () => {
  expect(useUi.getState().creditsOpen).toBe(false);
  useUi.getState().setCreditsOpen(true);
  expect(useUi.getState().creditsOpen).toBe(true);
  useUi.getState().setCreditsOpen(false);
});
