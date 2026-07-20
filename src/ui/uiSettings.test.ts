import { afterEach, expect, test, vi } from 'vitest';

function stubStorage(seed: Record<string, string> = {}) {
  const mem = new Map(Object.entries(seed));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, value);
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
  });
  return mem;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

test('ui settings default and persist to localStorage', async () => {
  const mem = stubStorage();
  const { UI_SETTINGS_KEY, useUiSettings } = await import('./uiSettings');

  expect(useUiSettings.getState().particlesEnabled).toBe(true);
  expect(useUiSettings.getState().highContrast).toBe(false);

  useUiSettings.getState().setHighContrast(true);
  useUiSettings.getState().setMasterVolume(0.4);

  const saved = JSON.parse(mem.get(UI_SETTINGS_KEY)!);
  expect(saved.highContrast).toBe(true);
  expect(saved.masterVolume).toBe(0.4);
});

test('ui settings load saved values and clamp volume sliders', async () => {
  const key = 'deep-hold-ui-settings';
  stubStorage({
    [key]: JSON.stringify({
      particlesEnabled: false,
      compactMode: true,
      masterVolume: 2,
      sfxVolume: -1,
    }),
  });

  const { useUiSettings } = await import('./uiSettings');

  expect(useUiSettings.getState().particlesEnabled).toBe(false);
  expect(useUiSettings.getState().compactMode).toBe(true);
  expect(useUiSettings.getState().masterVolume).toBe(1);
  expect(useUiSettings.getState().sfxVolume).toBe(0);
});
