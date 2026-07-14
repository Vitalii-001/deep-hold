# Cartoon UI Phase 1 / Sub-phase 1: Shell + Design System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Deep Hold's UI shell as a light-cartoon game layout (TopBar / LeftNav / MineStage / RightPanel / ModalLayer, mobile BottomNav) with the parchment-and-gold design system, moving existing panels into panel navigation — without touching simulation, economy, save, or balance semantics.

**Architecture:** New `src/ui/layout/` components compose EXISTING feature components (MineView, ClickButton, WorkersPanel…). Navigation is `activePanel` state in `uiStore` (no routing). Full `styles.css` rewrite to new design tokens happens once (Task 2) and includes layout classes so later tasks only add components. Visual verification uses the screenshot loop (`scripts/shot.mjs` + reading the PNG).

**Tech Stack:** React 18, TypeScript strict (`noUnusedLocals`), Zustand, Vitest, Playwright (dev-only, screenshots).

**Spec:** `docs/superpowers/specs/2026-07-13-cartoon-ui-phase1-shell-design.md`
**Visual reference:** `docs/design/proof_design_1.png` (light-cartoon direction #1)

## Global Constraints

- Do NOT change simulation/economy/save semantics (`tick.ts` math, `store.ts` actions, `save.ts`, `config/*` values). Behavior-preserving refactors that extract an existing formula into a shared helper are allowed.
- No routing, no new runtime dependencies. All in-game text English. Build < 5 MB.
- No balance numbers hardcoded in UI: resource reveal via `BALANCE.reveal`, thresholds via config, formulas via `src/game/economy.ts` helpers.
- `ALE_LOW_RATIO = 0.3` is a UX threshold → `src/ui/uiConstants.ts`, NOT `config/`.
- Credits is modal-only: trigger in TopBar, content in ModalLayer, state `creditsOpen` in uiStore. `'credits'` is NOT in `ActivePanel`.
- No fake Level UI — depth/layer progress only.
- Mobile (≤760px) order: TopBar → MineStage → BottomNav (sticky) → RightPanel. Nav must stay reachable.
- Settings button hidden until sub-phase 3 (no dead disabled gear).
- AdBoostsPanel must never render blank — locked boosts show unlock requirements.
- Tutorial arrows keep working: nav buttons carry `data-hint="nav-<panel>"`; existing step targets (`mine-btn`, `worker-*`, `building-*`, `ale-status`) keep their attributes wherever they move.
- Tests: Vitest, explicit imports, node env. Logic TDD'd; UI verified by `npm run build` + the screenshot loop (below). Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## Screenshot loop (used by Tasks 2–5)

```bash
npm run build
(npm run preview -- --port 4179 >/dev/null 2>&1 &)
sleep 4
node scripts/shot.mjs http://localhost:4179/ /tmp-or-scratchpad/shot-desktop.png 1280 820
node scripts/shot.mjs http://localhost:4179/ /tmp-or-scratchpad/shot-mobile.png 390 780
pkill -f "vite preview"
```

Then READ the PNG(s) with the Read tool and judge against the visual reference (read `docs/design/proof_design_1.png` at most once per task). Fix, rebuild, reshoot if clearly off. 1–3 iterations max — pixel-perfection comes later with raster assets.

## File Structure

```
src/ui/uiConstants.ts        — CREATE: ALE_LOW_RATIO
src/ui/uiStore.ts            — MODIFY: activeTab→activePanel (ActivePanel union), creditsOpen
src/game/economy.ts          — MODIFY: + totalWorkers, + caveInChancePerSec; isStriking uses totalWorkers
src/game/tick.ts             — MODIFY: cave-in chance uses caveInChancePerSec (behavior-preserving)
src/styles.css               — REWRITE: light-cartoon tokens + all classes incl. layout
src/ui/layout/navItems.ts    — CREATE: shared nav definition
src/ui/layout/GameShell.tsx  — CREATE
src/ui/layout/TopBar.tsx     — CREATE
src/ui/layout/LeftNav.tsx    — CREATE
src/ui/layout/BottomNav.tsx  — CREATE
src/ui/layout/MineStage.tsx  — CREATE (Task 3 wrap → Task 4 full)
src/ui/layout/RightPanel.tsx — CREATE
src/ui/layout/ModalLayer.tsx — CREATE
src/ui/AdBoostsPanel.tsx     — CREATE (wraps AdBoosts + locked rows)
src/ui/CreditsModal.tsx      — MODIFY: controlled by uiStore.creditsOpen
src/ui/TutorialHint.tsx      — MODIFY: nav-retarget + visible-element pick
src/ui/AleStatus.tsx         — MODIFY: 3-state card (Task 5)
src/ui/SidePanels.tsx        — DELETE (Task 3)
src/ui/DepthPanel.tsx        — DELETE (Task 4, content moves to MineStage)
src/App.tsx                  — MODIFY: thin (useGameLoop + GameShell)
src/assets/ART_CONTRACT.md   — CREATE (Task 6)
```

---

### Task 1: uiStore rework, UI constants, derived helpers (TDD)

**Files:**
- Create: `src/ui/uiConstants.ts`
- Modify: `src/ui/uiStore.ts`, `src/game/economy.ts`, `src/game/tick.ts`, `src/ui/SidePanels.tsx`, `src/ui/TutorialHint.tsx`, `src/ui/AleStatus.tsx` (mechanical rename/helper only)
- Test: `src/ui/uiStore.test.ts`, `src/game/economy.test.ts`

**Interfaces:**
- Consumes: existing `useUi` (has `activeTab`/`setActiveTab` from the onboarding feature), `isStriking`, `BALANCE.dig.caveIn`.
- Produces (later tasks rely on exactly these):
  - `type ActivePanel = 'overview' | 'workers' | 'buildings' | 'upgrades' | 'milestones' | 'stats' | 'adBoosts'` (NO `'credits'`)
  - `UiStore.activePanel: ActivePanel` (default `'workers'`), `setActivePanel(p)`, `creditsOpen: boolean` (default false), `setCreditsOpen(v)`
  - `src/ui/uiConstants.ts`: `export const ALE_LOW_RATIO = 0.3;`
  - `economy.ts`: `totalWorkers(s: GameState): number`, `caveInChancePerSec(s: GameState): number` (0 when digMode ≠ 'reckless'; else `BALANCE.dig.caveIn.chancePerSec * (1 - templeReductionPerLevel)^templeLevel`)

- [ ] **Step 1: Write the failing tests**

Replace `src/ui/uiStore.test.ts` with:

```ts
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
```

Append to `src/game/economy.test.ts` (merge imports into the existing `./economy` import line: add `totalWorkers, caveInChancePerSec`):

```ts
test('totalWorkers sums all four worker types', () => {
  const s = baseState({ workers: { miner: 3, smith: 1, brewer: 2, scout: 1 } });
  expect(totalWorkers(s)).toBe(7);
  expect(totalWorkers(baseState())).toBe(0);
});

test('caveInChancePerSec: zero when careful, config value when reckless, temple reduces it', () => {
  const s = baseState();
  expect(caveInChancePerSec(s)).toBe(0);
  s.digMode = 'reckless';
  expect(caveInChancePerSec(s)).toBeCloseTo(BALANCE.dig.caveIn.chancePerSec);
  s.buildings.temple = 2;
  expect(caveInChancePerSec(s)).toBeCloseTo(
    BALANCE.dig.caveIn.chancePerSec * Math.pow(1 - BALANCE.dig.caveIn.templeReductionPerLevel, 2),
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `activePanel`/`creditsOpen` missing; `totalWorkers`/`caveInChancePerSec` not exported.

- [ ] **Step 3: Implement**

Replace `src/ui/uiStore.ts` with:

```ts
import { create } from 'zustand';
import type { OfflineSummary } from '../game/offline';

export type ActivePanel =
  | 'overview'
  | 'workers'
  | 'buildings'
  | 'upgrades'
  | 'milestones'
  | 'stats'
  | 'adBoosts';

export interface UiStore {
  offlineSummary: OfflineSummary | null;
  toasts: { id: number; text: string }[];
  activePanel: ActivePanel;
  creditsOpen: boolean;
  setOfflineSummary: (s: OfflineSummary | null) => void;
  pushToast: (text: string) => void;
  removeToast: (id: number) => void;
  setActivePanel: (p: ActivePanel) => void;
  setCreditsOpen: (v: boolean) => void;
}

let toastId = 0;

export const useUi = create<UiStore>()((set) => ({
  offlineSummary: null,
  toasts: [],
  activePanel: 'workers',
  creditsOpen: false,
  setOfflineSummary: (s) => set({ offlineSummary: s }),
  pushToast: (text) => set((u) => ({ toasts: [...u.toasts, { id: ++toastId, text }] })),
  removeToast: (id) => set((u) => ({ toasts: u.toasts.filter((t) => t.id !== id) })),
  setActivePanel: (p) => set({ activePanel: p }),
  setCreditsOpen: (v) => set({ creditsOpen: v }),
}));
```

Create `src/ui/uiConstants.ts`:

```ts
// UX thresholds only — simulation balance lives in src/config/.
export const ALE_LOW_RATIO = 0.3; // ale/storage at or below this shows the "running low" warning
```

In `src/game/economy.ts`:

Add after `payCost`:

```ts
export function totalWorkers(s: GameState): number {
  return s.workers.miner + s.workers.smith + s.workers.brewer + s.workers.scout;
}
```

Replace the body of `isStriking` so it uses the helper (same behavior):

```ts
export function isStriking(s: GameState): boolean {
  const workers = totalWorkers(s);
  if (workers === 0) return false;
  const drink = (workers * BALANCE.ale.consumptionPerWorker) / statMult(s, 'aleThrift', 0);
  return s.resources.ale < drink * 0.1;
}
```

Add after `digSpeed`:

```ts
// Chance of a cave-in per second of reckless digging (0 in careful mode).
export function caveInChancePerSec(s: GameState): number {
  if (s.digMode !== 'reckless') return 0;
  return (
    BALANCE.dig.caveIn.chancePerSec *
    Math.pow(1 - BALANCE.dig.caveIn.templeReductionPerLevel, s.buildings.temple)
  );
}
```

In `src/game/tick.ts` — behavior-preserving refactor so the formula lives once. Add `caveInChancePerSec` to the economy import, then replace the cave-in block's chance computation:

```ts
  // --- digging + cave-in risk (reckless only)
  let caveInUntil = s.caveInUntil;
  if (s.digMode === 'reckless' && s.caveInUntil <= now) {
    const chance = caveInChancePerSec(s) * dt;
    if (rng() < chance) {
      caveInUntil = now + BALANCE.dig.caveIn.stunSec * 1000;
      res.stone *= 1 - BALANCE.dig.caveIn.stoneLossRatio;
    }
  }
```

(Existing tick tests cover both careful/reckless paths and must stay green unchanged.)

- [ ] **Step 4: Mechanical consumer updates (rename only, no behavior change)**

`src/ui/SidePanels.tsx`: change the import to `import { useUi, type ActivePanel } from './uiStore';`, `const TABS: ActivePanel[] = ['workers', 'buildings', 'upgrades'];`, and use `u.activePanel` / `u.setActivePanel` instead of `u.activeTab` / `u.setActiveTab`. Keep `data-hint={`tab-${t}`}` for now (Task 3 replaces this component).

`src/ui/TutorialHint.tsx`: replace `const activeTab = useUi((u) => u.activeTab);` with `const activePanel = useUi((u) => u.activePanel);` and in the targetKey line compare `active.tab !== activePanel` (still `tab-${active.tab}` for now).

`src/ui/AleStatus.tsx`: replace the inline `const totalWorkers = s.workers.miner + ...;` sum with the helper: import `totalWorkers` from economy and `const workers = totalWorkers(s);` (update the two usages `totalWorkers * ...` → `workers * ...`, `totalWorkers > 0` → `workers > 0`).

- [ ] **Step 5: Run tests + build to verify green**

Run: `npm run test` — Expected: PASS (all suites, incl. new).
Run: `npm run build` — Expected: no TS errors (catches any missed rename).

- [ ] **Step 6: Commit**

```bash
git add src/ui/uiConstants.ts src/ui/uiStore.ts src/ui/uiStore.test.ts src/game/economy.ts src/game/economy.test.ts src/game/tick.ts src/ui/SidePanels.tsx src/ui/TutorialHint.tsx src/ui/AleStatus.tsx
git commit -m "feat: activePanel/creditsOpen ui state, totalWorkers + caveInChancePerSec helpers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Light-cartoon design system — full styles.css rewrite

**Files:**
- Rewrite: `src/styles.css`

**Interfaces:**
- Consumes: design tokens from the spec (§Дизайн-токени), all class names referenced by existing components (`.panel .row .row-main .desc .warning .layer-name .locked .tabs .bar .bar-fill .morale .ale-status .resource-bar .resource .icon .click-area .mine-btn .float-num .chip .chip-sq .chip-tri .dig-mode .mine-view .toasts .toast .modal-backdrop .modal .mute-btn .credits-link .reset-btn .ad-boosts .side-panels .tutorial-hint .tutorial-bubble .tutorial-arrow .punch` + keyframes `floatUp toastIn hintBounce punch chipFly`).
- Produces: the same class names restyled light-cartoon, PLUS layout classes Tasks 3–5 rely on verbatim: `.game-shell .topbar .topbar-brand .king-portrait .depth-progress .depth-progress-label .depth-progress-track .depth-progress-fill .topbar-actions .shop-btn .left-nav .bottom-nav .nav-icon .mine-stage .surface-strip .mine-frame .right-panel .layer-card .layer-swatch .digmode-card .ale-merry .ale-low .ale-strike`.

- [ ] **Step 1: Replace `src/styles.css` entirely with:**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  /* Light-cartoon tokens (spec §Дизайн-токени; sampled from docs/design/proof_design_1.png) */
  --bg: #e6d2ac;
  --surface: #f2e5c8;
  --panel: #f8efd8;
  --panel-strong: #ecdab0;
  --wood: #8a5a34;
  --wood-dark: #5e3c22;
  --gold: #e2a828;
  --gold-dark: #b17e18;
  --stone: #b9ad95;
  --text: #3b2a17;
  --text-muted: #7c6a4e;
  --success: #4f9a3c;
  --warning: #e08a1e;
  --danger: #cc4526;
  --border: #cb9a63;
  --shadow: rgba(70, 45, 20, 0.22);
}

html, body, #root { height: 100%; }
body {
  background: linear-gradient(180deg, #f0e0bd 0%, var(--bg) 45%, #d9bf92 100%);
  color: var(--text);
  font-family: system-ui, 'Segoe UI', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

h1, h2, h3 { color: var(--wood-dark); }

button {
  font: inherit;
  font-weight: 600;
  color: var(--text);
  background: linear-gradient(180deg, var(--panel) 0%, var(--panel-strong) 100%);
  border: 2px solid var(--wood);
  border-radius: 10px;
  padding: 7px 12px;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 2px 0 var(--wood-dark), 0 3px 6px var(--shadow);
}
button:hover:not(:disabled) { filter: brightness(1.05); }
button:active:not(:disabled) { transform: translateY(1px); box-shadow: 0 1px 0 var(--wood-dark); }
button:disabled { opacity: 0.5; cursor: default; box-shadow: none; }
button.active {
  background: linear-gradient(180deg, var(--gold) 0%, var(--gold-dark) 100%);
  border-color: var(--gold-dark);
  color: #fff8e6;
  text-shadow: 0 1px 0 rgba(90, 60, 0, 0.5);
}

/* ---------- Game shell layout ---------- */
.game-shell {
  display: grid;
  grid-template-columns: 176px minmax(360px, 1fr) minmax(330px, 440px);
  grid-template-rows: auto 1fr;
  grid-template-areas: 'top top top' 'nav mine right';
  gap: 14px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px;
  min-height: 100%;
}

.topbar {
  grid-area: top;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  background: var(--panel);
  border: 2px solid var(--wood);
  border-radius: 14px;
  padding: 8px 14px;
  box-shadow: 0 3px 0 var(--wood-dark), 0 4px 10px var(--shadow);
}
.topbar-brand { display: flex; align-items: center; gap: 10px; }
.topbar-brand h1 { font-size: 1.25rem; letter-spacing: 0.5px; }
.king-portrait {
  font-size: 1.6rem; width: 44px; height: 44px; display: grid; place-items: center;
  background: var(--panel-strong); border: 2px solid var(--gold-dark); border-radius: 50%;
}
.depth-progress { min-width: 170px; }
.depth-progress-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
.depth-progress-track { height: 8px; background: var(--panel-strong); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.depth-progress-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-dark)); transition: width 0.4s; }
.topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.shop-btn { font-size: 0.9rem; }

.left-nav { grid-area: nav; display: flex; flex-direction: column; gap: 8px; align-self: start; }
.left-nav button, .bottom-nav button { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; }
.nav-icon { width: 1.3em; text-align: center; }
.bottom-nav { display: none; }

.mine-stage { grid-area: mine; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.right-panel { grid-area: right; display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.surface-strip {
  display: flex; justify-content: space-around; align-items: flex-end;
  font-size: 1.5rem; padding: 2px 10px 0;
  background: linear-gradient(180deg, #bfe0f5 0%, #d8ecd2 78%, #8a5a34 100%);
  border: 2px solid var(--wood); border-bottom: none;
  border-radius: 14px 14px 0 0; height: 56px; overflow: hidden;
}
.mine-frame {
  border: 3px solid var(--wood); border-top-width: 2px; border-radius: 0 0 14px 14px;
  overflow: hidden; box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.45), 0 3px 0 var(--wood-dark);
  background: #241a10;
}
.surface-strip + .mine-frame { margin-top: -12px; }

/* ---------- Panels & rows ---------- */
.panel {
  background: var(--panel);
  border: 2px solid var(--wood);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 3px 0 var(--wood-dark), 0 4px 10px var(--shadow);
}
.panel h2 { font-size: 1.05rem; margin-bottom: 4px; }
.desc { color: var(--text-muted); font-size: 0.85rem; margin: 2px 0; }
.warning { color: var(--danger); font-weight: 700; margin-top: 6px; }
.layer-name { font-weight: 700; }
.layer-swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--wood-dark); margin-right: 6px; vertical-align: -1px; }

.row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px dashed var(--border); }
.row:last-child { border-bottom: none; }
.row-main { flex: 1; min-width: 0; }
.row.locked { color: var(--text-muted); opacity: 0.85; }
.row button { min-width: 112px; }

.cost-label { display: inline-flex; gap: 8px; align-items: center; }
.icon { display: inline-block; width: 1.1em; }
.icon svg { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.1em; }

.tabs { display: flex; gap: 6px; margin-bottom: 8px; }
.tabs button { flex: 1; }
.side-panels { display: flex; flex-direction: column; gap: 8px; }

/* ---------- Resource bar ---------- */
.resource-bar { display: flex; gap: 8px; flex-wrap: wrap; font-variant-numeric: tabular-nums; }
.resource {
  display: inline-flex; align-items: center; gap: 5px; font-weight: 700; font-size: 0.9rem;
  background: var(--panel-strong); border: 1px solid var(--border); border-radius: 9px; padding: 3px 9px;
}

/* ---------- Mine button & click feedback ---------- */
.click-area { position: relative; text-align: center; }
.mine-btn {
  font-size: 1.5rem; font-weight: 800; padding: 18px 46px; border-radius: 16px;
  background: linear-gradient(180deg, #f4c445 0%, var(--gold) 55%, var(--gold-dark) 100%);
  border: 3px solid var(--gold-dark); color: #4a3000; text-shadow: 0 1px 0 rgba(255, 240, 200, 0.6);
  box-shadow: 0 4px 0 #8a6210, 0 6px 12px var(--shadow);
  user-select: none;
}
.mine-btn.punch { animation: punch 0.22s ease-out; }
@keyframes punch { 0% { transform: scale(1); } 35% { transform: scale(0.88); } 70% { transform: scale(1.05); } 100% { transform: scale(1); } }
.float-num {
  position: absolute; bottom: 90%; color: var(--gold-dark); font-weight: 800;
  pointer-events: none; animation: floatUp 0.8s ease-out forwards;
}
@keyframes floatUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-40px); } }
.chip { position: absolute; bottom: 88%; width: 7px; height: 7px; background: var(--stone); pointer-events: none; animation: chipFly 0.6s ease-out forwards; }
.chip-sq { border-radius: 1px; }
.chip-tri { width: 0; height: 0; background: none; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 8px solid var(--stone); }
@keyframes chipFly { from { opacity: 1; transform: translate(0, 0) rotate(0deg); } to { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); } }

.dig-mode { display: flex; gap: 8px; margin-top: 4px; }
.mine-view { width: 100%; height: 300px; display: block; }

/* ---------- Ale meter ---------- */
.ale-status .bar { height: 12px; background: var(--panel-strong); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 6px; }
.ale-status .bar-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-dark)); transition: width 0.3s; }
.morale { margin-top: 4px; font-weight: 700; }
.ale-merry { border-color: var(--wood); }
.ale-merry .morale { color: var(--success); }
.ale-low { border-color: var(--warning); }
.ale-low .bar-fill { background: linear-gradient(90deg, #f0b445, var(--warning)); }
.ale-low .morale { color: var(--warning); }
.ale-strike { border-color: var(--danger); }
.ale-strike .bar-fill { background: var(--danger); }
.ale-strike .morale { color: var(--danger); }
/* legacy state class used until Task 5 swaps AleStatus to ale-* classes */
.ale-status.strike { border-color: var(--danger); }

.ad-boosts { display: flex; flex-direction: column; gap: 8px; }

/* ---------- Toasts & modals ---------- */
.toasts { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; z-index: 20; }
.toast {
  background: var(--panel); border: 2px solid var(--gold-dark); border-radius: 10px; color: var(--text);
  padding: 10px 18px; font-weight: 600; box-shadow: 0 4px 10px var(--shadow);
  animation: toastIn 0.3s ease-out; max-width: 90vw;
}
@keyframes toastIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

.modal-backdrop { position: fixed; inset: 0; background: rgba(59, 42, 23, 0.55); display: flex; align-items: center; justify-content: center; z-index: 30; }
.modal {
  background: var(--panel); border: 3px solid var(--wood); border-radius: 14px; padding: 20px;
  max-width: 440px; width: 90vw; box-shadow: 0 6px 0 var(--wood-dark), 0 10px 24px var(--shadow);
}
.modal h2 { color: var(--wood-dark); margin-bottom: 8px; }
.modal ul { list-style: none; margin: 10px 0; }
.modal li { padding: 3px 0; }
.modal button { margin-top: 8px; width: 100%; }

.mute-btn { min-width: 42px; }
.credits-link { background: none; border: none; box-shadow: none; color: var(--text-muted); text-decoration: underline; padding: 4px; }
.reset-btn { border-color: var(--danger); color: var(--danger); }

/* ---------- Tutorial hint ---------- */
.tutorial-hint {
  position: fixed; z-index: 25; pointer-events: none;
  transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center;
}
.tutorial-hint.above { transform: translate(-50%, -100%); flex-direction: column-reverse; }
.tutorial-bubble {
  background: var(--panel); border: 2px solid var(--gold-dark); color: var(--text);
  border-radius: 10px; padding: 8px 12px; font-size: 0.85rem; font-weight: 700;
  max-width: 220px; text-align: center; box-shadow: 0 4px 12px var(--shadow);
}
.tutorial-arrow { width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; animation: hintBounce 0.9s ease-in-out infinite; }
.tutorial-hint.below .tutorial-arrow { border-bottom: 10px solid var(--gold-dark); }
.tutorial-hint.above .tutorial-arrow { border-top: 10px solid var(--gold-dark); }
@keyframes hintBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

/* ---------- Mobile ---------- */
@media (max-width: 760px) {
  .game-shell { display: flex; flex-direction: column; gap: 10px; padding: 8px; }
  .left-nav { display: none; }
  .bottom-nav {
    display: flex; gap: 6px; position: sticky; top: 0; z-index: 15;
    background: var(--bg); padding: 6px 0; border-bottom: 2px solid var(--wood);
  }
  .bottom-nav button { flex: 1; justify-content: center; font-size: 0.8rem; padding: 8px 4px; }
  .topbar { gap: 8px; }
  .depth-progress { min-width: 120px; }
  .mine-view { height: 220px; }
}
```

- [ ] **Step 2: Build + tests**

Run: `npm run build` — Expected: green.
Run: `npm run test` — Expected: all pass (CSS-only change).

- [ ] **Step 3: Screenshot self-check**

Run the screenshot loop (see Global). The OLD layout should now render light parchment: warm background, parchment panels, gold MINE button, readable dark-brown text, gold tab highlight. Read the PNG; fix obvious contrast/spacing regressions (e.g., unreadable text on light bg) and reshoot. Layout classes (.game-shell etc.) are unused until Task 3 — that's expected.

- [ ] **Step 4: Commit**

```bash
git add src/styles.css
git commit -m "feat: light-cartoon design system - full stylesheet rewrite with parchment/gold tokens

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: GameShell layout — TopBar, nav, RightPanel, ModalLayer, thin App

**Files:**
- Create: `src/ui/layout/navItems.ts`, `src/ui/layout/GameShell.tsx`, `src/ui/layout/TopBar.tsx`, `src/ui/layout/LeftNav.tsx`, `src/ui/layout/BottomNav.tsx`, `src/ui/layout/MineStage.tsx` (v1 wrap), `src/ui/layout/RightPanel.tsx`, `src/ui/layout/ModalLayer.tsx`, `src/ui/AdBoostsPanel.tsx`
- Modify: `src/ui/CreditsModal.tsx`, `src/ui/TutorialHint.tsx`, `src/App.tsx`
- Delete: `src/ui/SidePanels.tsx`

**Interfaces:**
- Consumes: `ActivePanel`, `useUi.activePanel/setActivePanel/creditsOpen/setCreditsOpen` (Task 1); layout CSS classes (Task 2); existing components: `ResourceBar`, `MuteButton`, `MineView`, `ClickButton`, `DepthPanel`, `AleStatus`, `WorkersPanel`, `BuildingsPanel`, `UpgradesPanel`, `AdBoosts`, `Toasts`, `OfflineModal`, `Watchers`, `TutorialHint`; `LAYERS`/`layerAtDepth`.
- Produces: `GameShell()` as the app root; nav buttons with `data-hint="nav-<panel>"`; `AdBoostsPanel()` (never blank); `CreditsModal` controlled by `creditsOpen`.

- [ ] **Step 1: Create the layout components**

`src/ui/layout/navItems.ts`:

```ts
import type { ActivePanel } from '../uiStore';

export interface NavItem {
  id: ActivePanel;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'workers', label: 'Workers', icon: '⛏️' },
  { id: 'buildings', label: 'Buildings', icon: '🏠' },
  { id: 'upgrades', label: 'Upgrades', icon: '⭐' },
  { id: 'adBoosts', label: 'Ad Boosts', icon: '📺' },
];
```

`src/ui/layout/LeftNav.tsx`:

```tsx
import { useUi } from '../uiStore';
import { NAV_ITEMS } from './navItems';

export function LeftNav() {
  const activePanel = useUi((u) => u.activePanel);
  const setActivePanel = useUi((u) => u.setActivePanel);
  return (
    <nav className="left-nav">
      {NAV_ITEMS.map((n) => (
        <button
          key={n.id}
          data-hint={`nav-${n.id}`}
          className={activePanel === n.id ? 'active' : ''}
          onClick={() => setActivePanel(n.id)}
        >
          <span className="nav-icon">{n.icon}</span> {n.label}
        </button>
      ))}
    </nav>
  );
}
```

`src/ui/layout/BottomNav.tsx`:

```tsx
import { useUi } from '../uiStore';
import { NAV_ITEMS } from './navItems';

export function BottomNav() {
  const activePanel = useUi((u) => u.activePanel);
  const setActivePanel = useUi((u) => u.setActivePanel);
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((n) => (
        <button
          key={n.id}
          data-hint={`nav-${n.id}`}
          className={activePanel === n.id ? 'active' : ''}
          onClick={() => setActivePanel(n.id)}
        >
          <span className="nav-icon">{n.icon}</span> {n.label}
        </button>
      ))}
    </nav>
  );
}
```

`src/ui/layout/TopBar.tsx`:

```tsx
import { useGame } from '../../game/store';
import { useUi } from '../uiStore';
import { ResourceBar } from '../ResourceBar';
import { MuteButton } from '../MuteButton';
import { LAYERS, layerAtDepth } from '../../config/layers';

export function TopBar() {
  const depth = useGame((s) => s.depth);
  const setActivePanel = useUi((u) => u.setActivePanel);
  const setCreditsOpen = useUi((u) => u.setCreditsOpen);
  const layer = layerAtDepth(depth);
  const next = LAYERS.find((l) => l.depth > depth);
  const progress = next
    ? Math.min(100, ((depth - layer.depth) / (next.depth - layer.depth)) * 100)
    : 100;
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="king-portrait" role="img" aria-label="Dwarf King">
          👑
        </span>
        <div>
          <h1>Deep Hold</h1>
          <div
            className="depth-progress"
            title={next ? `Next: ${next.name} at ${next.depth} m` : 'Deepest layer reached'}
          >
            <span className="depth-progress-label">
              {Math.floor(depth)} m · {layer.name}
            </span>
            <div className="depth-progress-track">
              <div className="depth-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
      <ResourceBar />
      <div className="topbar-actions">
        <button className="shop-btn" onClick={() => setActivePanel('adBoosts')}>
          🛒 Shop
        </button>
        <button className="credits-link" onClick={() => setCreditsOpen(true)}>
          Credits
        </button>
        <MuteButton />
      </div>
    </header>
  );
}
```

`src/ui/layout/MineStage.tsx` (v1 — wraps existing pieces; Task 4 completes it):

```tsx
import { MineView } from '../MineView';
import { ClickButton } from '../ClickButton';
import { DepthPanel } from '../DepthPanel';

export function MineStage() {
  return (
    <section className="mine-stage">
      <div className="surface-strip" aria-hidden="true">
        <span>⛰️</span>
        <span>🏘️</span>
        <span>🌲</span>
      </div>
      <div className="mine-frame">
        <MineView />
      </div>
      <ClickButton />
      <DepthPanel />
    </section>
  );
}
```

`src/ui/layout/RightPanel.tsx`:

```tsx
import { useUi } from '../uiStore';
import { AleStatus } from '../AleStatus';
import { WorkersPanel } from '../WorkersPanel';
import { BuildingsPanel } from '../BuildingsPanel';
import { UpgradesPanel } from '../UpgradesPanel';
import { AdBoostsPanel } from '../AdBoostsPanel';

export function RightPanel() {
  const activePanel = useUi((u) => u.activePanel);
  return (
    <aside className="right-panel">
      <AleStatus />
      {activePanel === 'workers' && <WorkersPanel />}
      {activePanel === 'buildings' && <BuildingsPanel />}
      {activePanel === 'upgrades' && <UpgradesPanel />}
      {activePanel === 'adBoosts' && <AdBoostsPanel />}
    </aside>
  );
}
```

`src/ui/layout/ModalLayer.tsx`:

```tsx
import { Toasts } from '../Toasts';
import { OfflineModal } from '../OfflineModal';
import { CreditsModal } from '../CreditsModal';

export function ModalLayer() {
  return (
    <>
      <Toasts />
      <OfflineModal />
      <CreditsModal />
    </>
  );
}
```

`src/ui/layout/GameShell.tsx`:

```tsx
import { TopBar } from './TopBar';
import { LeftNav } from './LeftNav';
import { BottomNav } from './BottomNav';
import { MineStage } from './MineStage';
import { RightPanel } from './RightPanel';
import { ModalLayer } from './ModalLayer';
import { Watchers } from '../Watchers';
import { TutorialHint } from '../TutorialHint';

export function GameShell() {
  return (
    <div className="game-shell">
      <TopBar />
      <LeftNav />
      <MineStage />
      <BottomNav />
      <RightPanel />
      <Watchers />
      <TutorialHint />
      <ModalLayer />
    </div>
  );
}
```

`src/ui/AdBoostsPanel.tsx` (never blank — locked boosts show requirements):

```tsx
import { useGame } from '../game/store';
import { AdBoosts } from './AdBoosts';

export function AdBoostsPanel() {
  const brewery = useGame((s) => s.buildings.brewery);
  const temple = useGame((s) => s.buildings.temple);
  return (
    <div className="panel">
      <AdBoosts />
      {brewery < 1 && (
        <div className="row locked">
          <div className="row-main">
            <strong>Free Barrel of Ale</strong>
            <p className="desc">Build a Brewery to unlock.</p>
          </div>
        </div>
      )}
      {temple < 1 && (
        <div className="row locked">
          <div className="row-main">
            <strong>Ancestors' Blessing</strong>
            <p className="desc">Build a Temple of the Ancestors to unlock.</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Make CreditsModal controlled (trigger lives in TopBar)**

Replace `src/ui/CreditsModal.tsx` with:

```tsx
import { useUi } from './uiStore';
import { resetGame } from '../game/boot';

const AUTHORS = ['Lorc', 'Delapouite', 'Faithtoken']; // keep in sync with CREDITS.md

export function CreditsModal() {
  const open = useUi((u) => u.creditsOpen);
  const setCreditsOpen = useUi((u) => u.setCreditsOpen);
  if (!open) return null;

  const onReset = () => {
    if (!window.confirm('Delete ALL progress and start over? This cannot be undone.')) return;
    resetGame();
    setCreditsOpen(false);
  };

  return (
    <div className="modal-backdrop" onClick={() => setCreditsOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Credits</h2>
        <p className="desc">Icons by {AUTHORS.join(', ')} from game-icons.net (CC BY 3.0).</p>
        <button onClick={() => setCreditsOpen(false)}>Close</button>
        <button className="reset-btn" onClick={onReset}>
          Reset save
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Retarget the tutorial to nav buttons (and handle duplicate data-hints)**

In `src/ui/TutorialHint.tsx`, replace the targetKey/el block with (both navs render the same `data-hint`; one is display:none — pick the visible one):

```tsx
  const targetKey = active.tab && active.tab !== activePanel ? `nav-${active.tab}` : active.target;
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-hint="${targetKey}"]`));
  const el = els.find((e) => e.getBoundingClientRect().width > 0) ?? null;
  if (!el) return null;
```

- [ ] **Step 4: Thin App + delete SidePanels**

Replace `src/App.tsx` with:

```tsx
import { useGameLoop } from './game/loop';
import { GameShell } from './ui/layout/GameShell';

export default function App() {
  useGameLoop();
  return <GameShell />;
}
```

Delete `src/ui/SidePanels.tsx` (`git rm src/ui/SidePanels.tsx`).

- [ ] **Step 5: Build + tests**

Run: `npm run build` — Expected: green (catches dangling SidePanels imports).
Run: `npm run test` — Expected: all pass.

- [ ] **Step 6: Screenshot self-check (desktop + mobile)**

Run the screenshot loop at 1280×820 AND 390×780. Read both PNGs. Verify: TopBar with portrait/title/progress/resources/actions; LeftNav on desktop left with 4 buttons and gold active state; mine column center; ale card + workers panel right; mobile shows BottomNav between MineStage and the panel, no horizontal scroll. Compare tone against `docs/design/proof_design_1.png` (read once). Fix and reshoot if broken.

- [ ] **Step 7: Commit**

```bash
git add src/ui/layout src/ui/AdBoostsPanel.tsx src/ui/CreditsModal.tsx src/ui/TutorialHint.tsx src/App.tsx
# SidePanels.tsx deletion is already staged by `git rm` in Step 4
git commit -m "feat: GameShell layout - TopBar, panel nav, RightPanel, ModalLayer, thin App

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: MineStage full — layer card, dig-mode card with cave-in risk

**Files:**
- Rewrite: `src/ui/layout/MineStage.tsx`
- Delete: `src/ui/DepthPanel.tsx`

**Interfaces:**
- Consumes: `digSpeed`, `caveInChancePerSec` (Task 1), `LAYERS`/`layerAtDepth`, `useGame` (`depth`, `digMode`, `setDigMode`, `caveInUntil`), `MineView`, `ClickButton`.
- Produces: MineStage with `.layer-card` and `.digmode-card`; DepthPanel removed.

- [ ] **Step 1: Rewrite `src/ui/layout/MineStage.tsx` with:**

```tsx
import { useGame } from '../../game/store';
import { MineView } from '../MineView';
import { ClickButton } from '../ClickButton';
import { LAYERS, layerAtDepth } from '../../config/layers';
import { caveInChancePerSec, digSpeed } from '../../game/economy';

export function MineStage() {
  const depth = useGame((s) => s.depth);
  const digMode = useGame((s) => s.digMode);
  const setDigMode = useGame((s) => s.setDigMode);
  const caveInUntil = useGame((s) => s.caveInUntil);
  const speed = useGame((s) => digSpeed(s, Date.now()));
  const risk = useGame((s) => caveInChancePerSec(s));
  const layer = layerAtDepth(depth);
  const next = LAYERS.find((l) => l.depth > depth);
  const now = Date.now();
  const stunned = caveInUntil > now;

  return (
    <section className="mine-stage">
      <div className="surface-strip" aria-hidden="true">
        <span>⛰️</span>
        <span>🏘️</span>
        <span>🌲</span>
      </div>
      <div className="mine-frame">
        <MineView />
      </div>
      <ClickButton />
      <div className="panel layer-card">
        <h2>Depth: {Math.floor(depth)} m</h2>
        <p className="layer-name">
          <span className="layer-swatch" style={{ background: layer.color }} />
          {layer.name}
        </p>
        <p className="desc">{layer.flavor}</p>
        {next && (
          <p className="desc">
            Next layer: {next.name} at {next.depth} m
          </p>
        )}
        <p className="desc">Dig speed: {speed.toFixed(2)} m/s</p>
      </div>
      <div className="panel digmode-card">
        <div className="dig-mode">
          <button className={digMode === 'careful' ? 'active' : ''} onClick={() => setDigMode('careful')}>
            Careful
          </button>
          <button className={digMode === 'reckless' ? 'active' : ''} onClick={() => setDigMode('reckless')}>
            Reckless (x2)
          </button>
        </div>
        <p className="desc">Cave-in risk: {(risk * 100).toFixed(1)}%/s</p>
        {stunned && (
          <p className="warning">
            CAVE-IN! The dwarves are digging out... ({Math.ceil((caveInUntil - now) / 1000)}s)
          </p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Delete `src/ui/DepthPanel.tsx`** (`git rm src/ui/DepthPanel.tsx`)

- [ ] **Step 3: Build + tests**

Run: `npm run build` — Expected: green (catches any remaining DepthPanel import).
Run: `npm run test` — Expected: all pass.

- [ ] **Step 4: Screenshot self-check**

Screenshot desktop; read it. Verify layer card shows swatch + name + flavor + next-layer + dig speed; dig-mode card shows Careful active (gold) and "Cave-in risk: 0.0%/s" in careful mode.

- [ ] **Step 5: Commit**

```bash
git add src/ui/layout/MineStage.tsx
# DepthPanel.tsx deletion is already staged by `git rm` in Step 2
git commit -m "feat: full MineStage - layer card and dig-mode card with cave-in risk

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: AleStatus — three-state meter card

**Files:**
- Modify: `src/ui/AleStatus.tsx`

**Interfaces:**
- Consumes: `ALE_LOW_RATIO` (uiConstants), `totalWorkers`/`isStriking`/`aleStorage`/`statMult` (economy), `BALANCE`, `WORKERS`, `Icon`, `formatNumber`.
- Produces: `AleStatus` with root classes `ale-merry` / `ale-low` / `ale-strike` (Task 2 CSS), keeping `data-hint="ale-status"`. Simulation untouched — Low is visual only.

- [ ] **Step 1: Replace `src/ui/AleStatus.tsx` with:**

```tsx
import { useGame } from '../game/store';
import { WORKERS } from '../config/workers';
import { BALANCE } from '../config/balance';
import { aleStorage, isStriking, statMult, totalWorkers } from '../game/economy';
import { formatNumber } from '../game/format';
import { ALE_LOW_RATIO } from './uiConstants';
import { Icon } from './Icon';

type AleState = 'merry' | 'low' | 'strike';

export function AleStatus() {
  const s = useGame();
  const now = Date.now();
  const storage = aleStorage(s);
  const workers = totalWorkers(s);
  const drink = (workers * BALANCE.ale.consumptionPerWorker) / statMult(s, 'aleThrift', now);
  const morale = s.resources.ale >= drink * 0.1 ? BALANCE.ale.happyMult : BALANCE.ale.strikeMult;
  const stun = s.caveInUntil > now ? BALANCE.dig.caveIn.stunMult : 1;
  const brew = s.workers.brewer * WORKERS.brewer.baseRate * statMult(s, 'brew', now) * morale * stun;
  const ratio = storage > 0 ? s.resources.ale / storage : 0;

  const state: AleState = isStriking(s)
    ? 'strike'
    : workers > 0 && ratio <= ALE_LOW_RATIO
      ? 'low'
      : 'merry';
  const text =
    state === 'strike'
      ? '🪧 ON STRIKE — no ale, work crawls!'
      : state === 'low'
        ? '⚠️ Ale is running low!'
        : workers > 0
          ? '😊 The dwarves work merrily'
          : 'Hire some dwarves to get digging.';

  return (
    <div className={`panel ale-status ale-${state}`} data-hint="ale-status">
      <div className="bar">
        <div className="bar-fill" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
      <p>
        <Icon id="ale" /> {formatNumber(s.resources.ale)}/{formatNumber(storage)}
        <span className="desc"> (+{brew.toFixed(1)}/s, −{drink.toFixed(1)}/s)</span>
      </p>
      <p className="morale">{text}</p>
    </div>
  );
}
```

- [ ] **Step 2: Build + tests**

Run: `npm run build` and `npm run test` — Expected: green / all pass.

- [ ] **Step 3: Screenshot self-check**

Fresh save starts at ale 20/50 = 40% → merry state ("Hire some dwarves…" with 0 workers). Screenshot and read: card has wood border and gold bar. (Low/strike states are config-driven; visual QA of those lands on the owner's playtest.)

- [ ] **Step 4: Commit**

```bash
git add src/ui/AleStatus.tsx
git commit -m "feat: three-state ale meter card (merry/low/strike)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: ART_CONTRACT.md + final verification

**Files:**
- Create: `src/assets/ART_CONTRACT.md`

- [ ] **Step 1: Create `src/assets/ART_CONTRACT.md`:**

```markdown
# Deep Hold — Art Asset Contract (light-cartoon, direction #1)

Reference: `docs/design/proof_design_1.png`. All raster assets are WebP, @2x
(displayed size × 2), transparent background unless noted. Small icons ship in
sprite atlases; characters/buildings/layers as individual files. Keep total
added assets under ~2 MB (build cap is 5 MB).

## Characters (idle pose, ~128×128 display → 256×256 px)
- src/assets/characters/miner.webp
- src/assets/characters/smith.webp
- src/assets/characters/brewer.webp
- src/assets/characters/scout.webp
- src/assets/characters/king.webp        (TopBar portrait, circular crop-safe)

## Buildings (~160×120 display → 320×240 px)
- src/assets/buildings/mine-shaft.webp
- src/assets/buildings/brewery.webp
- src/assets/buildings/smelter.webp
- src/assets/buildings/forge.webp
- src/assets/buildings/great-hall.webp
- src/assets/buildings/temple.webp

## Depth layers (tileable horizontally, ~800×300 px, opaque)
- src/assets/layers/topsoil.webp
- src/assets/layers/stone.webp
- src/assets/layers/iron-veins.webp
- src/assets/layers/gold-seams.webp
- src/assets/layers/gem-hollows.webp
- src/assets/layers/ancient-ruins.webp

## UI
- src/assets/ui/panel-border.webp        (9-slice tile for CSS border-image, ~48×48 px)
- src/assets/icons/atlas.webp            (detailed item icons, 64×64 px cells; row/col map in a
                                          companion atlas.json when delivered)
  Icons needed: stone, ore, ingot, gold, gem, ale, pickaxe, anvil, barrel,
  spyglass, chest, scroll, star, shield, coin, hourglass.

## Notes for the artist
- Match the warm parchment/wood/gold palette (see tokens in
  docs/superpowers/specs/2026-07-13-cartoon-ui-phase1-shell-design.md).
- Until these land, the game uses emoji/SVG placeholders — file names above are
  the integration contract; matching names means zero code changes to swap in.
```

- [ ] **Step 2: Full verification**

Run: `npm run test` — Expected: ALL tests pass.
Run: `npm run build` — Expected: green.
Run (PowerShell): `"{0:N2} MB" -f ((Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum).Sum / 1MB)` — Expected: < 5 MB.
Screenshot desktop (1280×820) + mobile (390×780), read both, confirm acceptance criteria from the spec: complete light-cartoon shell on desktop; usable mobile with reachable sticky nav; tutorial arrow visible on fresh game pointing at MINE.

- [ ] **Step 3: Commit**

```bash
git add src/assets/ART_CONTRACT.md
git commit -m "docs: art asset contract for light-cartoon direction

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Post-plan notes (not tasks)

- Sub-phase 2 (Overview with Goal-card, Milestones, Stats, default panel → overview) and sub-phase 3 (SettingsModal, ConfirmationModal, persisted UI settings) build directly on `ActivePanel` and `ModalLayer` from this plan.
- The canvas (`MineView`) intentionally stays dark inside `.mine-frame` until layer art arrives per ART_CONTRACT.
- Owner visual pass after merge: tone match vs mockup #1, mobile feel at 375px, tutorial arrows in the new layout.
