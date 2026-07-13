import type { GameState } from './types';
import { initialState } from './store';

export const SAVE_KEY = 'deep-hold-save';
// Bumping this invalidates all existing saves. Add a migration path in loadGame before ever incrementing.
export const SAVE_VERSION = 1;

const STATE_KEYS = Object.keys(initialState()) as (keyof GameState)[];

function pickPersisted(s: GameState): GameState {
  const out = {} as Record<string, unknown>;
  for (const k of STATE_KEYS) out[k] = s[k];
  return out as unknown as GameState;
}

export function saveGame(state: GameState, now: number = Date.now()): void {
  try {
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, savedAt: now, state: pickPersisted(state) }),
    );
  } catch {
    // storage full or unavailable — skip this save, try again next autosave
  }
}

export function loadGame(): { state: GameState; savedAt: number } | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SAVE_VERSION || typeof data.savedAt !== 'number') return null;
    const init = initialState();
    const saved = data.state ?? {};
    const state: GameState = {
      ...init,
      ...saved,
      resources: { ...init.resources, ...(saved.resources ?? {}) },
      workers: { ...init.workers, ...(saved.workers ?? {}) },
      buildings: { ...init.buildings, ...(saved.buildings ?? {}) },
    };
    return { state, savedAt: data.savedAt };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
