import type { GameState } from './types';
import { initialState } from './store';
import { mergeRecords } from './records';

export const SAVE_KEY = 'deep-hold-save';
// When bumping, add a MIGRATIONS entry for the new version — old saves are
// upgraded step-by-step in loadGame instead of being dropped.
export const SAVE_VERSION = 7;

// Each migration lifts a raw persisted state from (version - 1) to `version`.
// They run on the raw saved object BEFORE the initialState merge, so they only
// need to add/rename fields that can't rely on plain defaulting (renames,
// semantic changes); brand-new fields with safe defaults are covered by the
// merge itself.
type RawState = Record<string, unknown>;
const MIGRATIONS: Record<number, (s: RawState) => RawState> = {
  // v2 (Phase 0): playedSec game-time clock — plain default is fine, entry
  // exists to exercise the migration path end-to-end.
  2: (s) => ({ ...s, playedSec: s.playedSec ?? 0 }),
  // v3 (Phase 1, Ale v2): brew mode + feast/rally game-time timers.
  3: (s) => ({
    ...s,
    brewMode: s.brewMode ?? 'thin',
    feastUntilSec: 0,
    feastCooldownUntilSec: 0,
    rallyReadyAtSec: 0,
  }),
  // v4 (Phase 2, Mining v2): digMode folds into miningMethod (§6.1).
  4: (s) => {
    const { digMode, ...rest } = s;
    return {
      ...rest,
      miningMethod: digMode === 'reckless' ? 'bulk' : 'balanced',
      surveyProgress: {},
      surveyBonuses: {},
    };
  },
  // v5 (Phase 3, Retention): permanent modifiers + Royal Orders board.
  5: (s) => ({ ...s, permanentBonuses: [], activeOrders: [] }),
  // v6 (Phase 3 strict): Royal Order history + return timers.
  6: (s) => ({ ...s, ordersCompleted: [], expeditions: [] }),
  // v7 (Phase 4, King's Hall awards): no retro-grant; counters start at zero.
  7: (s) => ({
    ...s,
    trophiesEarned: [],
    artifactsFound: [],
    displayedArtifacts: [],
    newAwards: [],
    records: mergeRecords(undefined),
  }),
};

const STATE_KEYS = Object.keys(initialState()) as (keyof GameState)[];

function pickPersisted(s: GameState): GameState {
  const out = {} as Record<string, unknown>;
  for (const k of STATE_KEYS) out[k] = s[k];
  return out as unknown as GameState;
}

// A save that has clearly been played: the intro would only annoy this player.
export function hasMeaningfulProgress(s: GameState): boolean {
  // Note: stone is not a signal — fresh games now start with a little stone.
  return (
    s.depth > 0 ||
    s.upgrades.length > 0 ||
    Object.values(s.workers).some((n) => n > 0) ||
    Object.values(s.buildings).some((n) => n > 0)
  );
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
    let version = data.version;
    if (typeof version !== 'number' || version < 1 || version > SAVE_VERSION) return null;
    if (typeof data.savedAt !== 'number') return null;
    let saved = data.state ?? {}; // any: raw JSON, validated by merge below
    while (version < SAVE_VERSION) {
      version++;
      const migrate = MIGRATIONS[version];
      if (!migrate) return null; // gap in the migration chain — treat as unreadable
      saved = migrate(saved);
    }
    const init = initialState();
    const state: GameState = {
      ...init,
      ...saved,
      resources: { ...init.resources, ...(saved.resources ?? {}) },
      workers: { ...init.workers, ...(saved.workers ?? {}) },
      buildings: { ...init.buildings, ...(saved.buildings ?? {}) },
      records: mergeRecords(saved.records as Partial<GameState['records']> | undefined),
    };
    if (saved.onboarding === undefined) {
      // Save predates the intro: players with real progress skip it silently.
      state.onboarding = { introSeen: hasMeaningfulProgress(state) };
    }
    return { state, savedAt: data.savedAt };
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
