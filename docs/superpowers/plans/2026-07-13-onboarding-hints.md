# Onboarding Hints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach new players Deep Hold's core loop (click → hire → build → ale cycle → strike) with up to six non-blocking animated-arrow hints, one at a time, driven by a declarative step config.

**Architecture:** Tutorial steps are declarative data in `src/config/tutorial.ts` (each with `showWhen`/`doneWhen` predicates over `GameState`). A pure evaluator `evaluateTutorial(state, shownId)` decides which single step to show and which to auto-complete. One renderer component `TutorialHint` subscribes to the store, commits completions, and draws a bouncing arrow + text bubble next to the target element (located by `data-hint` attribute). Completed steps persist in the save via a new `tutorialDone: string[]` field.

**Tech Stack:** React 18, TypeScript (strict, `noUnusedLocals`), Zustand, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-13-onboarding-hints-design.md`

## Global Constraints

- All in-game text is English. Communication with the user is Ukrainian.
- All balance/config numbers live in `src/config/` — never hardcode costs/depths in components or logic. Tutorial thresholds must be read from existing configs (`WORKERS`, `BUILDINGS`).
- Tests: Vitest, explicit imports (`import { test, expect } from 'vitest'`), node environment. Pure logic (`src/game/*`, `src/config/*`) is TDD'd; UI components are verified by `npm run build` (tsc strict) — skip the manual dev-server visual step (that is the owner's playtest, done separately).
- Production build must stay < 5 MB (currently ~0.19 MB). No blocking overlays, no forced clicks — hints are ignorable and use `pointer-events: none`.
- Show at most ONE hint at a time.
- `SAVE_VERSION` must NOT change: the new `tutorialDone` field is added to `initialState()`, and `loadGame`'s existing forward-compatible merge fills it with `[]` for old saves.
- Commit messages end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

## File Structure

```
src/game/types.ts        — MODIFY: add tutorialDone to GameState
src/game/store.ts        — MODIFY: initialState + completeTutorialStep action
src/game/economy.ts      — MODIFY: add pure isStriking(state)
src/game/tutorial.ts     — CREATE: evaluateTutorial (pure evaluator)
src/config/tutorial.ts   — CREATE: TutorialStepConfig + TUTORIAL_STEPS
src/ui/uiStore.ts        — MODIFY: activeTab + setActiveTab
src/ui/SidePanels.tsx    — MODIFY: use uiStore activeTab; data-hint on tab buttons
src/ui/ClickButton.tsx   — MODIFY: data-hint="mine-btn"
src/ui/WorkersPanel.tsx  — MODIFY: data-hint="worker-<id>" on rows
src/ui/BuildingsPanel.tsx— MODIFY: data-hint="building-<id>" on unlocked rows
src/ui/AleStatus.tsx     — MODIFY: data-hint="ale-status"; use isStriking
src/ui/Watchers.tsx      — MODIFY: use isStriking (de-dupe)
src/ui/TutorialHint.tsx  — CREATE: the renderer
src/App.tsx              — MODIFY: mount <TutorialHint />
src/styles.css           — MODIFY: arrow + bubble styles
```

Data facts locked by this plan (read from config, not hardcoded):
- Miner cost = `WORKERS.miner.baseCost.stone` = 15.
- Mine Shaft cost = `BUILDINGS.mineShaft.baseCost.stone` = 50.
- Brewery unlock depth = `BUILDINGS.brewery.unlockDepth` = 25.
- Strike predicate (mirrors `AleStatus`): with `totalWorkers > 0`, striking when `ale < drink * 0.1`, where `drink = totalWorkers * BALANCE.ale.consumptionPerWorker / statMult(s, 'aleThrift', now)`. `aleThrift` is not a production stat, so `now` is irrelevant → the predicate is pure.

---

### Task 1: Persisted tutorial state — `tutorialDone` field + `completeTutorialStep`

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/store.ts`
- Test: `src/game/store.test.ts`, `src/game/save.test.ts`

**Interfaces:**
- Consumes: existing `GameState`, `initialState()`, `useGame`, `saveGame`/`loadGame`.
- Produces: `GameState.tutorialDone: string[]`; store action `completeTutorialStep(id: string): void` (idempotent, appends id once); `initialState().tutorialDone === []`. Persistence is automatic — `save.ts` derives persisted keys from `initialState()`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/store.test.ts`:

```ts
test('initialState starts with no completed tutorial steps', () => {
  expect(initialState().tutorialDone).toEqual([]);
});

test('completeTutorialStep records an id exactly once (idempotent)', () => {
  useGame.getState().hydrate(initialState());
  useGame.getState().completeTutorialStep('clickMine');
  useGame.getState().completeTutorialStep('clickMine');
  useGame.getState().completeTutorialStep('hireMiner');
  expect(useGame.getState().tutorialDone).toEqual(['clickMine', 'hireMiner']);
});
```

Append to `src/game/save.test.ts`:

```ts
test('tutorialDone roundtrips and defaults to [] for old saves', () => {
  const s = initialState();
  s.tutorialDone = ['clickMine', 'hireMiner'];
  saveGame(s, 1);
  expect(loadGame()!.state.tutorialDone).toEqual(['clickMine', 'hireMiner']);

  mem.clear();
  mem.set(SAVE_KEY, JSON.stringify({ version: 1, savedAt: 1, state: { depth: 300 } }));
  expect(loadGame()!.state.tutorialDone).toEqual([]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `tutorialDone` missing on `GameState` (tsc/vitest error) and `completeTutorialStep` not a function.

- [ ] **Step 3: Add the field to the type**

In `src/game/types.ts`, add to the `GameState` interface (after `muted: boolean;`):

```ts
  tutorialDone: string[]; // completed tutorial step ids
```

- [ ] **Step 4: Add to initial state and the store**

In `src/game/store.ts`, `initialState()` return object, add after `muted: false,`:

```ts
    tutorialDone: [],
```

Add to the `GameStore` interface (after `claimAleBarrel: () => void;`):

```ts
  completeTutorialStep: (id: string) => void;
```

Add the action to the store object (after the `claimAleBarrel` action):

```ts
  completeTutorialStep: (id) =>
    set((s) => (s.tutorialDone.includes(id) ? s : { tutorialDone: [...s.tutorialDone, id] })),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test`
Expected: PASS (all suites). Then `npm run build` — Expected: no TS errors.

- [ ] **Step 6: Commit**

```bash
git add src/game/types.ts src/game/store.ts src/game/store.test.ts src/game/save.test.ts
git commit -m "feat: persisted tutorialDone state and completeTutorialStep action

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Pure `isStriking` helper + de-duplicate existing consumers

**Files:**
- Modify: `src/game/economy.ts`
- Modify: `src/ui/AleStatus.tsx`, `src/ui/Watchers.tsx`
- Test: `src/game/economy.test.ts`

**Interfaces:**
- Consumes: `GameState`, `BALANCE`, `statMult`.
- Produces: `isStriking(s: GameState): boolean` — pure; true when there is at least one worker and ale cannot cover ~0.1s of thirst. Replaces the inline strike expressions in `AleStatus` and `Watchers`.

- [ ] **Step 1: Write the failing test**

Append to `src/game/economy.test.ts`:

```ts
import { isStriking } from './economy';

test('isStriking: no workers never strike', () => {
  const s = baseState({ workers: { miner: 0, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 0;
  expect(isStriking(s)).toBe(false);
});

test('isStriking: workers with no ale are on strike', () => {
  const s = baseState({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 0;
  expect(isStriking(s)).toBe(true);
});

test('isStriking: plenty of ale means no strike', () => {
  const s = baseState({ workers: { miner: 5, smith: 0, brewer: 0, scout: 0 } });
  s.resources.ale = 50;
  expect(isStriking(s)).toBe(false);
});
```

Note: `baseState` is the helper already defined at the top of `economy.test.ts`. Merge the `isStriking` import into the existing `import { ... } from './economy';` line rather than adding a second import.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — `isStriking` is not exported.

- [ ] **Step 3: Implement the helper**

Append to `src/game/economy.ts`:

```ts
// True when at least one dwarf is working and there isn't enough ale to cover
// one ~0.1s tick of thirst. Pure: 'aleThrift' is not a production stat, so the
// `now` passed to statMult never changes the result.
export function isStriking(s: GameState): boolean {
  const totalWorkers = s.workers.miner + s.workers.smith + s.workers.brewer + s.workers.scout;
  if (totalWorkers === 0) return false;
  const drink = (totalWorkers * BALANCE.ale.consumptionPerWorker) / statMult(s, 'aleThrift', 0);
  return s.resources.ale < drink * 0.1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Refactor the two existing consumers to use it**

In `src/ui/AleStatus.tsx`:
- Add `isStriking` to the economy import: `import { aleStorage, isStriking, statMult } from '../game/economy';`
- Replace the line `const striking = s.resources.ale < drink * 0.1 && totalWorkers > 0;` with:

```ts
  const striking = isStriking(s);
```

(Leave `drink`, `morale`, `stun`, `brew` as-is — they are still used for the displayed rates.)

In `src/ui/Watchers.tsx`:
- Change the imports: remove `import { BALANCE } from '../config/balance';` and change the economy import to `import { isStriking } from '../game/economy';` (drop `statMult` — it becomes unused).
- Replace the whole `const striking = useGame((s) => { ... });` selector with:

```ts
  const striking = useGame(isStriking);
```

- [ ] **Step 6: Verify build and tests**

Run: `npm run build` — Expected: no TS errors (confirms `BALANCE`/`statMult` are no longer unused in `Watchers.tsx`).
Run: `npm run test` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/economy.ts src/game/economy.test.ts src/ui/AleStatus.tsx src/ui/Watchers.tsx
git commit -m "refactor: extract pure isStriking helper, use it in AleStatus and Watchers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Tutorial step config

**Files:**
- Create: `src/config/tutorial.ts`
- Test: `src/config/tutorial.test.ts`

**Interfaces:**
- Consumes: `GameState`, `WORKERS`, `BUILDINGS`, `isStriking`.
- Produces:
  - `type HintTab = 'workers' | 'buildings' | 'upgrades'`
  - `interface TutorialStepConfig { id: string; text: string; target: string; tab?: HintTab; requiresShown?: boolean; showWhen(s: GameState): boolean; doneWhen(s: GameState): boolean }`
  - `TUTORIAL_STEPS: TutorialStepConfig[]` — the six steps in order.

- [ ] **Step 1: Write the failing test**

Create `src/config/tutorial.test.ts`:

```ts
import { expect, test } from 'vitest';
import { TUTORIAL_STEPS } from './tutorial';
import { initialState } from '../game/store';
import type { GameState } from '../game/types';

function base(over: Partial<GameState> = {}): GameState {
  return { ...initialState(), ...over };
}
const step = (id: string) => TUTORIAL_STEPS.find((s) => s.id === id)!;

test('there are six steps with unique ids in order', () => {
  const ids = TUTORIAL_STEPS.map((s) => s.id);
  expect(ids).toEqual(['clickMine', 'hireMiner', 'buildShaft', 'buildBrewery', 'hireBrewer', 'strikeExplain']);
});

test('clickMine shows on a fresh game and completes at 15 stone', () => {
  const s = base();
  expect(step('clickMine').showWhen(s)).toBe(true);
  expect(step('clickMine').doneWhen(s)).toBe(false);
  s.resources.stone = 15;
  expect(step('clickMine').showWhen(s)).toBe(false);
  expect(step('clickMine').doneWhen(s)).toBe(true);
});

test('hireMiner shows once affordable, completes on first miner', () => {
  const s = base({ resources: { ...base().resources, stone: 15 } });
  expect(step('hireMiner').showWhen(s)).toBe(true);
  s.workers.miner = 1;
  expect(step('hireMiner').showWhen(s)).toBe(false);
  expect(step('hireMiner').doneWhen(s)).toBe(true);
});

test('buildShaft needs a miner and 50 stone', () => {
  const s = base({ workers: { ...base().workers, miner: 1 }, resources: { ...base().resources, stone: 50 } });
  expect(step('buildShaft').showWhen(s)).toBe(true);
  s.buildings.mineShaft = 1;
  expect(step('buildShaft').doneWhen(s)).toBe(true);
  expect(step('buildShaft').showWhen(s)).toBe(false);
});

test('buildBrewery shows at 25 m, completes when built', () => {
  const s = base({ depth: 25 });
  expect(step('buildBrewery').showWhen(s)).toBe(true);
  s.buildings.brewery = 1;
  expect(step('buildBrewery').doneWhen(s)).toBe(true);
  expect(step('buildBrewery').showWhen(s)).toBe(false);
});

test('hireBrewer shows once a brewery exists', () => {
  const s = base({ buildings: { ...base().buildings, brewery: 1 } });
  expect(step('hireBrewer').showWhen(s)).toBe(true);
  s.workers.brewer = 1;
  expect(step('hireBrewer').doneWhen(s)).toBe(true);
  expect(step('hireBrewer').showWhen(s)).toBe(false);
});

test('strikeExplain shows during a strike and is marked requiresShown', () => {
  const s = base({ workers: { ...base().workers, miner: 3 } });
  s.resources.ale = 0; // striking
  expect(step('strikeExplain').requiresShown).toBe(true);
  expect(step('strikeExplain').showWhen(s)).toBe(true);
  expect(step('strikeExplain').doneWhen(s)).toBe(false);
  s.resources.ale = 50; // ale restored
  expect(step('strikeExplain').doneWhen(s)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — cannot resolve `./tutorial`.

- [ ] **Step 3: Write the config**

Create `src/config/tutorial.ts`:

```ts
import type { GameState } from '../game/types';
import { isStriking } from '../game/economy';
import { WORKERS } from './workers';
import { BUILDINGS } from './buildings';

export type HintTab = 'workers' | 'buildings' | 'upgrades';

export interface TutorialStepConfig {
  id: string;
  text: string;
  target: string; // data-hint value of the element the arrow points at
  tab?: HintTab; // if the target lives in a side-panel tab, name it here
  requiresShown?: boolean; // doneWhen is only checked while this step is the shown one
  showWhen: (s: GameState) => boolean;
  doneWhen: (s: GameState) => boolean;
}

const MINER_COST = WORKERS.miner.baseCost.stone ?? 0; // 15
const SHAFT_COST = BUILDINGS.mineShaft.baseCost.stone ?? 0; // 50
const BREWERY_DEPTH = BUILDINGS.brewery.unlockDepth; // 25

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: 'clickMine',
    text: 'Click MINE to dig stone!',
    target: 'mine-btn',
    showWhen: (s) => s.workers.miner === 0 && s.resources.stone < MINER_COST,
    doneWhen: (s) => s.resources.stone >= MINER_COST || s.workers.miner >= 1,
  },
  {
    id: 'hireMiner',
    text: 'Hire a miner — he digs while you rest.',
    target: 'worker-miner',
    tab: 'workers',
    showWhen: (s) => s.workers.miner === 0 && s.resources.stone >= MINER_COST,
    doneWhen: (s) => s.workers.miner >= 1,
  },
  {
    id: 'buildShaft',
    text: 'Build a Mine Shaft — +3 miner slots.',
    target: 'building-mineShaft',
    tab: 'buildings',
    showWhen: (s) => s.buildings.mineShaft === 0 && s.workers.miner >= 1 && s.resources.stone >= SHAFT_COST,
    doneWhen: (s) => s.buildings.mineShaft >= 1,
  },
  {
    id: 'buildBrewery',
    text: "The ale won't last forever — build a Brewery!",
    target: 'building-brewery',
    tab: 'buildings',
    showWhen: (s) => s.buildings.brewery === 0 && s.depth >= BREWERY_DEPTH,
    doneWhen: (s) => s.buildings.brewery >= 1,
  },
  {
    id: 'hireBrewer',
    text: 'Hire a brewer — one keeps ~30 dwarves merry.',
    target: 'worker-brewer',
    tab: 'workers',
    showWhen: (s) => s.buildings.brewery >= 1 && s.workers.brewer === 0,
    doneWhen: (s) => s.workers.brewer >= 1,
  },
  {
    id: 'strikeExplain',
    text: 'No ale = STRIKE: work slows to 40%. Keep the ale flowing!',
    target: 'ale-status',
    requiresShown: true,
    showWhen: (s) => isStriking(s),
    doneWhen: (s) => !isStriking(s),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/tutorial.ts src/config/tutorial.test.ts
git commit -m "feat: declarative tutorial step config (6 steps to the ale cycle)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Pure tutorial evaluator

**Files:**
- Create: `src/game/tutorial.ts`
- Test: `src/game/tutorial.test.ts`

**Interfaces:**
- Consumes: `GameState`, `TUTORIAL_STEPS`, `TutorialStepConfig`.
- Produces:
  - `interface TutorialEvaluation { toComplete: string[]; active: TutorialStepConfig | null }`
  - `evaluateTutorial(s: GameState, shownId: string | null): TutorialEvaluation` — returns the ids to mark done this pass (any not-yet-done step whose `doneWhen` holds; `requiresShown` steps only when `shownId` equals their id) and the single active step (first not-done step whose `showWhen` holds, excluding ones just auto-completed).

- [ ] **Step 1: Write the failing test**

Create `src/game/tutorial.test.ts`:

```ts
import { expect, test } from 'vitest';
import { evaluateTutorial } from './tutorial';
import { initialState } from './store';
import type { GameState } from './types';

function base(over: Partial<GameState> = {}): GameState {
  return { ...initialState(), ...over };
}

test('fresh game: clickMine is active, nothing to complete', () => {
  const { active, toComplete } = evaluateTutorial(base(), null);
  expect(active?.id).toBe('clickMine');
  expect(toComplete).toEqual([]);
});

test('at 15 stone: clickMine auto-completes and hireMiner becomes active', () => {
  const s = base({ resources: { ...base().resources, stone: 15 } });
  const { active, toComplete } = evaluateTutorial(s, 'clickMine');
  expect(toComplete).toContain('clickMine');
  expect(active?.id).toBe('hireMiner');
});

test('a step auto-completed this pass is never returned as active', () => {
  const s = base({ resources: { ...base().resources, stone: 15 } });
  const { active, toComplete } = evaluateTutorial(s, null);
  expect(toComplete).toContain('clickMine');
  expect(active?.id).not.toBe('clickMine');
});

test('already-done steps are skipped', () => {
  const s = base({ resources: { ...base().resources, stone: 15 }, tutorialDone: ['clickMine'] });
  const { toComplete, active } = evaluateTutorial(s, null);
  expect(toComplete).not.toContain('clickMine');
  expect(active?.id).toBe('hireMiner');
});

test('veteran save: all non-strike steps auto-complete, no active hint', () => {
  const s = base({
    depth: 300,
    workers: { miner: 5, smith: 1, brewer: 2, scout: 0 },
    buildings: { mineShaft: 3, smelter: 1, forge: 0, brewery: 2, greatHall: 0, temple: 0 },
    resources: { stone: 1e6, ore: 0, ingot: 0, gold: 0, gem: 0, ale: 200 },
  });
  const { active, toComplete } = evaluateTutorial(s, null);
  expect(active).toBeNull();
  expect(toComplete).toEqual(['clickMine', 'hireMiner', 'buildShaft', 'buildBrewery', 'hireBrewer']);
});

test('requiresShown gates strikeExplain: not completed unless it is the shown step', () => {
  // Not striking, so doneWhen (!isStriking) is true — but it must not complete
  // until it has actually been shown.
  const s = base({ workers: { ...base().workers, miner: 3 }, resources: { ...base().resources, ale: 200 } });
  expect(evaluateTutorial(s, null).toComplete).not.toContain('strikeExplain');
  expect(evaluateTutorial(s, 'strikeExplain').toComplete).toContain('strikeExplain');
});

test('strikeExplain becomes active during a strike', () => {
  const s = base({
    workers: { miner: 3, smith: 0, brewer: 0, scout: 0 },
    tutorialDone: ['clickMine', 'hireMiner', 'buildShaft', 'buildBrewery', 'hireBrewer'],
  });
  s.resources.ale = 0;
  const { active } = evaluateTutorial(s, null);
  expect(active?.id).toBe('strikeExplain');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — cannot resolve `./tutorial`.

- [ ] **Step 3: Write the evaluator**

Create `src/game/tutorial.ts`:

```ts
import type { GameState } from './types';
import { TUTORIAL_STEPS, type TutorialStepConfig } from '../config/tutorial';

export interface TutorialEvaluation {
  toComplete: string[]; // step ids to mark done this pass
  active: TutorialStepConfig | null; // the single hint to show, or null
}

export function evaluateTutorial(s: GameState, shownId: string | null): TutorialEvaluation {
  const done = new Set(s.tutorialDone);
  const toComplete: string[] = [];

  for (const step of TUTORIAL_STEPS) {
    if (done.has(step.id)) continue;
    // requiresShown steps (the strike hint) only auto-complete while they are the
    // one being shown — otherwise "not striking" would complete it at game start,
    // before it ever appears.
    const mayComplete = !step.requiresShown || shownId === step.id;
    if (mayComplete && step.doneWhen(s)) {
      toComplete.push(step.id);
      done.add(step.id);
    }
  }

  let active: TutorialStepConfig | null = null;
  for (const step of TUTORIAL_STEPS) {
    if (done.has(step.id)) continue; // skips steps just auto-completed above
    if (step.showWhen(s)) {
      active = step;
      break;
    }
  }

  return { toComplete, active };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/tutorial.ts src/game/tutorial.test.ts
git commit -m "feat: pure tutorial evaluator (one active hint, auto-complete, requiresShown)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Move active tab into `uiStore`; wire SidePanels + tab `data-hint`s

**Files:**
- Modify: `src/ui/uiStore.ts`
- Modify: `src/ui/SidePanels.tsx`
- Test: `src/ui/uiStore.test.ts` (create)

**Interfaces:**
- Consumes: existing `useUi`.
- Produces: `type PanelTab = 'workers' | 'buildings' | 'upgrades'`; `UiStore.activeTab: PanelTab` (default `'workers'`); `UiStore.setActiveTab(t: PanelTab): void`. `SidePanels` reads/writes the tab from `useUi` instead of local state, and each tab button carries `data-hint={`tab-${t}`}`.

- [ ] **Step 1: Write the failing test**

Create `src/ui/uiStore.test.ts`:

```ts
import { expect, test } from 'vitest';
import { useUi } from './uiStore';

test('activeTab defaults to workers and can be switched', () => {
  expect(useUi.getState().activeTab).toBe('workers');
  useUi.getState().setActiveTab('buildings');
  expect(useUi.getState().activeTab).toBe('buildings');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL — `activeTab`/`setActiveTab` do not exist.

- [ ] **Step 3: Extend the UI store**

Replace the contents of `src/ui/uiStore.ts` with:

```ts
import { create } from 'zustand';
import type { OfflineSummary } from '../game/offline';

export type PanelTab = 'workers' | 'buildings' | 'upgrades';

export interface UiStore {
  offlineSummary: OfflineSummary | null;
  toasts: { id: number; text: string }[];
  activeTab: PanelTab;
  setOfflineSummary: (s: OfflineSummary | null) => void;
  pushToast: (text: string) => void;
  removeToast: (id: number) => void;
  setActiveTab: (t: PanelTab) => void;
}

let toastId = 0;

export const useUi = create<UiStore>()((set) => ({
  offlineSummary: null,
  toasts: [],
  activeTab: 'workers',
  setOfflineSummary: (s) => set({ offlineSummary: s }),
  pushToast: (text) => set((u) => ({ toasts: [...u.toasts, { id: ++toastId, text }] })),
  removeToast: (id) => set((u) => ({ toasts: u.toasts.filter((t) => t.id !== id) })),
  setActiveTab: (t) => set({ activeTab: t }),
}));
```

- [ ] **Step 4: Rewire SidePanels**

Replace the contents of `src/ui/SidePanels.tsx` with:

```tsx
import { useUi, type PanelTab } from './uiStore';
import { WorkersPanel } from './WorkersPanel';
import { BuildingsPanel } from './BuildingsPanel';
import { UpgradesPanel } from './UpgradesPanel';

const TABS: PanelTab[] = ['workers', 'buildings', 'upgrades'];

export function SidePanels() {
  const activeTab = useUi((u) => u.activeTab);
  const setActiveTab = useUi((u) => u.setActiveTab);
  return (
    <div className="side-panels">
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            data-hint={`tab-${t}`}
            className={activeTab === t ? 'active' : ''}
            onClick={() => setActiveTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {activeTab === 'workers' && <WorkersPanel />}
      {activeTab === 'buildings' && <BuildingsPanel />}
      {activeTab === 'upgrades' && <UpgradesPanel />}
    </div>
  );
}
```

- [ ] **Step 5: Verify build and tests**

Run: `npm run build` — Expected: no TS errors.
Run: `npm run test` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/uiStore.ts src/ui/uiStore.test.ts src/ui/SidePanels.tsx
git commit -m "feat: active side-panel tab in uiStore; data-hint on tab buttons

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Hint renderer, target attributes, styles, and mount

**Files:**
- Create: `src/ui/TutorialHint.tsx`
- Modify: `src/ui/ClickButton.tsx`, `src/ui/WorkersPanel.tsx`, `src/ui/BuildingsPanel.tsx`, `src/ui/AleStatus.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `useGame` (whole state + `completeTutorialStep`), `useUi` (`activeTab`), `evaluateTutorial`, the `data-hint` attributes added here.
- Produces: `TutorialHint()` — mounted once in `App`; renders a single bouncing arrow + text bubble positioned over the active step's target (or the target's tab button when that tab isn't open). No exported logic; verified by typecheck.

- [ ] **Step 1: Add `data-hint` attributes to the target elements**

`src/ui/ClickButton.tsx` — add the attribute to the mine button:

```tsx
      <button className="mine-btn" data-hint="mine-btn" onPointerDown={onPress}>
        ⛏️ MINE
      </button>
```

`src/ui/WorkersPanel.tsx` — add the attribute to the row wrapper:

```tsx
          <div key={w.id} data-hint={`worker-${w.id}`} className="row">
```

`src/ui/BuildingsPanel.tsx` — add the attribute to the **unlocked** row wrapper only (the `return (` inside the map, after the locked-row early return):

```tsx
          <div key={b.id} data-hint={`building-${b.id}`} className="row">
```

`src/ui/AleStatus.tsx` — add the attribute to the panel root:

```tsx
    <div className={`panel ale-status ${striking ? 'strike' : ''}`} data-hint="ale-status">
```

- [ ] **Step 2: Write the renderer**

Create `src/ui/TutorialHint.tsx`:

```tsx
import { useEffect, useReducer, useRef } from 'react';
import { useGame } from '../game/store';
import { useUi } from './uiStore';
import { evaluateTutorial } from '../game/tutorial';

export function TutorialHint() {
  const s = useGame();
  const completeTutorialStep = useGame((g) => g.completeTutorialStep);
  const activeTab = useUi((u) => u.activeTab);
  const shownIdRef = useRef<string | null>(null);
  const [, forceRerender] = useReducer((n: number) => n + 1, 0);

  // Reposition on viewport resize (store ticks already re-render ~10x/s otherwise).
  useEffect(() => {
    window.addEventListener('resize', forceRerender);
    return () => window.removeEventListener('resize', forceRerender);
  }, []);

  const { toComplete, active } = evaluateTutorial(s, shownIdRef.current);

  // Commit completions outside render. completeTutorialStep is idempotent.
  const completeKey = toComplete.join(',');
  useEffect(() => {
    toComplete.forEach((id) => completeTutorialStep(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeKey]);

  // Remember what is shown now so the next pass can honor requiresShown.
  useEffect(() => {
    shownIdRef.current = active ? active.id : null;
  });

  if (!active) return null;

  // If the target lives in a side-panel tab that isn't open, point at that tab.
  const targetKey = active.tab && active.tab !== activeTab ? `tab-${active.tab}` : active.target;
  const el = document.querySelector<HTMLElement>(`[data-hint="${targetKey}"]`);
  if (!el) return null;

  const rect = el.getBoundingClientRect();
  const below = rect.bottom < window.innerHeight * 0.7;
  const cx = rect.left + rect.width / 2;
  const y = below ? rect.bottom + 10 : rect.top - 10;

  return (
    <div className={`tutorial-hint ${below ? 'below' : 'above'}`} style={{ left: cx, top: y }}>
      <div className="tutorial-arrow" />
      <div className="tutorial-bubble">{active.text}</div>
    </div>
  );
}
```

- [ ] **Step 3: Mount it in App**

In `src/App.tsx`, add the import:

```tsx
import { TutorialHint } from './ui/TutorialHint';
```

And render it just after `<Watchers />`:

```tsx
      <Watchers />
      <TutorialHint />
      <Toasts />
      <OfflineModal />
```

- [ ] **Step 4: Add styles**

Append to `src/styles.css`:

```css
.tutorial-hint {
  position: fixed; z-index: 40; pointer-events: none;
  transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center;
}
.tutorial-hint.above { transform: translate(-50%, -100%); flex-direction: column-reverse; }
.tutorial-bubble {
  background: var(--panel-2); border: 1px solid var(--accent); color: var(--text);
  border-radius: 8px; padding: 8px 12px; font-size: 0.85rem; font-weight: 600;
  max-width: 220px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}
.tutorial-arrow { width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; animation: hintBounce 0.9s ease-in-out infinite; }
.tutorial-hint.below .tutorial-arrow { border-bottom: 10px solid var(--accent); }
.tutorial-hint.above .tutorial-arrow { border-top: 10px solid var(--accent); }
@keyframes hintBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
```

- [ ] **Step 5: Verify build and tests**

Run: `npm run build` — Expected: no TS errors (confirms all imports/attributes typecheck).
Run: `npm run test` — Expected: PASS (54+ tests).

- [ ] **Step 6: Commit**

```bash
git add src/ui/TutorialHint.tsx src/ui/ClickButton.tsx src/ui/WorkersPanel.tsx src/ui/BuildingsPanel.tsx src/ui/AleStatus.tsx src/App.tsx src/styles.css
git commit -m "feat: tutorial hint renderer with bouncing arrow and target attributes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Final verification and owner playtest handoff

**Files:** none (verification only).

- [ ] **Step 1: Full suite + build + size**

Run: `npm run test` — Expected: all pass.
Run: `npm run build` — Expected: success.
Run (PowerShell): `"{0:N2} MB" -f ((Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum).Sum / 1MB)` — Expected: well under 5 MB.

- [ ] **Step 2: Owner playtest checklist (dev server)**

This step is for the project owner (Ukrainian-speaking playtester), not the agent. On a fresh game (`npm run dev`, open `http://localhost:5173/?reset`):

1. Arrow points at MINE; click until 15 stone → arrow moves to the Miner row (Workers tab).
2. Hire the miner → arrow moves to Mine Shaft (Buildings tab); if on Workers tab, arrow first points at the "Buildings" tab button.
3. Build Mine Shaft → arrow clears until 25 m.
4. Reach 25 m → arrow points at Brewery; build it → arrow points at Brewer (Workers tab).
5. Let ale run out → strike toast fires AND the arrow points at the ale panel with the strike explanation; restore ale → hint clears.
6. Reload the page → no completed hint reappears.
7. Credits → Reset save (or `?reset`) → the tutorial starts over from step 1.

- [ ] **Step 3: Commit any doc note (optional)**

No code change expected. If the playtest surfaces a wording/threshold tweak, it is a one-line edit in `src/config/tutorial.ts` — make it, re-run `npm run test` + `npm run build`, and commit with a `fix:` message.

---

## Post-plan notes (not tasks)

- All hint text and trigger thresholds live in `src/config/tutorial.ts`; retuning is config-only.
- `shownId` threading exists solely for the strike step's `requiresShown` gate — the renderer records the currently-shown id in a ref and feeds it to the next evaluation.
- Adding hints for later mechanics (smelter, upgrades, Reckless) is just more entries in `TUTORIAL_STEPS` plus a `data-hint` on the new target — no evaluator or renderer changes.
