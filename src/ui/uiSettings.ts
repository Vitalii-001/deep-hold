import { create } from 'zustand';

export const UI_SETTINGS_KEY = 'deep-hold-ui-settings';

export interface UiSettingsState {
  particlesEnabled: boolean;
  highContrast: boolean;
  compactMode: boolean;
  masterVolume: number;
  sfxVolume: number;
}

export interface UiSettingsStore extends UiSettingsState {
  setParticlesEnabled: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  setCompactMode: (enabled: boolean) => void;
  setMasterVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
}

const DEFAULT_SETTINGS: UiSettingsState = {
  particlesEnabled: true,
  highContrast: false,
  compactMode: false,
  masterVolume: 1,
  sfxVolume: 1,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

function loadSettings(): UiSettingsState {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(UI_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const saved = JSON.parse(raw) as Partial<UiSettingsState>;
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      masterVolume: clamp01(saved.masterVolume ?? DEFAULT_SETTINGS.masterVolume),
      sfxVolume: clamp01(saved.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persist(settings: UiSettingsState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Non-critical: gameplay save is separate, so UI preferences can fail silently.
  }
}

function savePatch(set: (fn: (state: UiSettingsStore) => UiSettingsStore) => void, patch: Partial<UiSettingsState>) {
  set((state) => {
    const next = { ...state, ...patch };
    const persisted: UiSettingsState = {
      particlesEnabled: next.particlesEnabled,
      highContrast: next.highContrast,
      compactMode: next.compactMode,
      masterVolume: next.masterVolume,
      sfxVolume: next.sfxVolume,
    };
    persist(persisted);
    return next;
  });
}

export const useUiSettings = create<UiSettingsStore>()((set) => ({
  ...loadSettings(),
  setParticlesEnabled: (enabled) => savePatch(set, { particlesEnabled: enabled }),
  setHighContrast: (enabled) => savePatch(set, { highContrast: enabled }),
  setCompactMode: (enabled) => savePatch(set, { compactMode: enabled }),
  setMasterVolume: (value) => savePatch(set, { masterVolume: clamp01(value) }),
  setSfxVolume: (value) => savePatch(set, { sfxVolume: clamp01(value) }),
}));
