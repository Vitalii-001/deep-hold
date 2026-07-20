import { expect, test } from 'vitest';
import { useUi } from './uiStore';
import type { OfflineSummary } from '../game/offline';

test('activePanel defaults to overview and can be switched', () => {
  expect(useUi.getState().activePanel).toBe('overview');
  useUi.getState().setActivePanel('buildings');
  expect(useUi.getState().activePanel).toBe('buildings');
  useUi.getState().setActivePanel('overview');
});

test('creditsOpen defaults to false and toggles', () => {
  expect(useUi.getState().creditsOpen).toBe(false);
  useUi.getState().setCreditsOpen(true);
  expect(useUi.getState().creditsOpen).toBe(true);
  useUi.getState().setCreditsOpen(false);
});

test('settingsOpen defaults to false and toggles', () => {
  expect(useUi.getState().settingsOpen).toBe(false);
  useUi.getState().setSettingsOpen(true);
  expect(useUi.getState().settingsOpen).toBe(true);
  useUi.getState().setSettingsOpen(false);
});

test('confirmation can be opened and closed', () => {
  const request = {
    title: 'Reset save?',
    message: 'Delete all progress?',
    confirmLabel: 'Reset',
    onConfirm: () => undefined,
  };
  expect(useUi.getState().confirmation).toBeNull();
  useUi.getState().openConfirmation(request);
  expect(useUi.getState().confirmation?.title).toBe('Reset save?');
  useUi.getState().closeConfirmation();
  expect(useUi.getState().confirmation).toBeNull();
});

test('setOfflineSummary keeps the latest report after the modal is dismissed', () => {
  const summary: OfflineSummary = {
    elapsedSec: 120,
    gained: { stone: 10, ore: 0, ingot: 0, gold: 0, gem: 0, ale: 5 },
    metersDug: 2,
    events: [],
    ordersPaused: 0,
    expeditionsReady: [],
  };
  useUi.getState().setOfflineSummary(summary);
  expect(useUi.getState().offlineSummary).toBe(summary);
  expect(useUi.getState().latestOfflineSummary).toBe(summary);
  useUi.getState().setOfflineSummary(null);
  expect(useUi.getState().offlineSummary).toBeNull();
  expect(useUi.getState().latestOfflineSummary).toBe(summary);
});
