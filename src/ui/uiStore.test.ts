import { expect, test } from 'vitest';
import { useUi } from './uiStore';

test('activeTab defaults to workers and can be switched', () => {
  expect(useUi.getState().activeTab).toBe('workers');
  useUi.getState().setActiveTab('buildings');
  expect(useUi.getState().activeTab).toBe('buildings');
});
