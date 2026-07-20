import { test } from 'vitest';
import type { BuildingId, GameState, WorkerId } from '../src/game/types';
import { initialState } from '../src/game/store';
import { simulateTick } from '../src/game/tick';
import { simulateOffline } from '../src/game/offline';
import { getAleForecast } from '../src/game/forecast';
import { EXPEDITIONS } from '../src/config/expeditions';
import { applyOrderClaim, orderStatus } from '../src/game/orders';
import { claimExpedition, expeditionStatuses, startExpedition } from '../src/game/expeditions';
import {
  buildingCost,
  canAfford,
  isStriking,
  payCost,
  workerCap,
  workerCost,
} from '../src/game/economy';
import { BUILDINGS } from '../src/config/buildings';
import { UPGRADE_LIST } from '../src/config/upgrades';

// Balance harness (NEW_GAME_ARCHITECTURE.md §2.5): a greedy bot plays the real
// simulation and prints pacing metrics. Not a test — run via `npm run sim:balance`.
// Compare the output against the tuning targets in §4 of the plan.

const SIM_HOURS = 8;
const STEP_SEC = 1;
const NOW0 = 1_700_000_000_000;
const noCaveIn = () => 1; // bot digs carefully; keep runs deterministic

function tryHire(s: GameState, id: WorkerId): GameState | null {
  const cost = workerCost(s, id);
  if (s.workers[id] >= workerCap(s, id) || !canAfford(s.resources, cost)) return null;
  return { ...s, resources: payCost(s.resources, cost), workers: { ...s.workers, [id]: s.workers[id] + 1 } };
}

function tryBuild(s: GameState, id: BuildingId): GameState | null {
  const cfg = BUILDINGS[id];
  if (s.buildings[id] >= cfg.maxLevel || s.depth < cfg.unlockDepth) return null;
  const cost = buildingCost(s, id);
  if (!canAfford(s.resources, cost)) return null;
  return { ...s, resources: payCost(s.resources, cost), buildings: { ...s.buildings, [id]: s.buildings[id] + 1 } };
}

function tryUpgrade(s: GameState): GameState | null {
  for (const u of UPGRADE_LIST) {
    if (s.upgrades.includes(u.id) || s.depth < u.unlockDepth) continue;
    if (u.requiresBuilding && s.buildings[u.requiresBuilding] < 1) continue;
    if (!canAfford(s.resources, u.cost)) continue;
    return { ...s, resources: payCost(s.resources, u.cost), upgrades: [...s.upgrades, u.id] };
  }
  return null;
}

// Greedy priorities: keep ale net-positive, then expand production/depth.
function botAct(
  s: GameState,
  now: number,
): { state: GameState; purchases: number; orderClaims: number; expeditionStarts: number; expeditionClaims: number } {
  let cur = s;
  let purchases = 0;
  let orderClaims = 0;
  let expeditionStarts = 0;
  let expeditionClaims = 0;

  for (const order of cur.activeOrders) {
    const status = orderStatus(cur, order);
    if (status?.claimable) {
      cur = applyOrderClaim(cur, order.templateId);
      orderClaims++;
    }
  }

  for (const status of expeditionStatuses(cur)) {
    if (status.ready) {
      cur = claimExpedition(cur, status.expedition.templateId, noCaveIn);
      expeditionClaims++;
    }
  }

  for (const cfg of EXPEDITIONS) {
    if (cur.expeditions.some((e) => e.templateId === cfg.id)) continue;
    const next = startExpedition(cur, cfg.id);
    if (next !== cur) {
      cur = next;
      expeditionStarts++;
    }
  }

  for (;;) {
    let next: GameState | null = null;
    const ale = getAleForecast(cur, now);

    if (ale.netAle < 0 && cur.workers.brewer < workerCap(cur, 'brewer')) next = tryHire(cur, 'brewer');
    if (!next && cur.buildings.brewery === 0) next = tryBuild(cur, 'brewery');
    if (!next && ale.netAle < 0 && cur.workers.brewer >= workerCap(cur, 'brewer')) next = tryBuild(cur, 'brewery');
    if (!next && cur.buildings.smelter === 0) next = tryBuild(cur, 'smelter');
    if (!next && cur.workers.smith < workerCap(cur, 'smith')) next = tryHire(cur, 'smith');
    if (!next && cur.workers.miner < workerCap(cur, 'miner')) next = tryHire(cur, 'miner');
    if (!next && cur.workers.miner >= workerCap(cur, 'miner')) next = tryBuild(cur, 'mineShaft');
    if (!next) next = tryUpgrade(cur);
    if (!next) next = tryBuild(cur, 'forge');
    if (!next) next = tryBuild(cur, 'greatHall');
    if (!next && cur.workers.scout < workerCap(cur, 'scout')) next = tryHire(cur, 'scout');
    if (!next) next = tryBuild(cur, 'temple');

    if (!next) return { state: cur, purchases, orderClaims, expeditionStarts, expeditionClaims };
    cur = next;
    purchases++;
  }
}

function fmt(sec: number | null): string {
  if (sec === null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${s}s`;
}

test('balance report', () => {
  const depthMarks = [25, 75, 120, 200, 450, 700, 1000];
  const depthTimes: Record<number, number | null> = Object.fromEntries(depthMarks.map((d) => [d, null]));
  const buildMarks: Record<string, number | null> = {
    firstMiner: null, firstShaft: null, brewery: null, brewer: null, smelter: null,
    forge: null, greatHall: null, temple: null,
  };

  let s = initialState();
  let strikingSec = 0;
  let netAleSum = 0;
  let purchasesFirst10m = 0;
  let orderClaims = 0;
  let expeditionStarts = 0;
  let expeditionClaims = 0;
  let snapshot30m: GameState | null = null;
  const totalSteps = (SIM_HOURS * 3600) / STEP_SEC;

  for (let step = 0; step < totalSteps; step++) {
    const t = step * STEP_SEC;
    const now = NOW0 + t * 1000;

    const acted = botAct(s, now);
    s = acted.state;
    if (t < 600) purchasesFirst10m += acted.purchases;
    orderClaims += acted.orderClaims;
    expeditionStarts += acted.expeditionStarts;
    expeditionClaims += acted.expeditionClaims;

    s = simulateTick(s, STEP_SEC, now, noCaveIn);

    if (isStriking(s)) strikingSec += STEP_SEC;
    netAleSum += getAleForecast(s, now).netAle;

    for (const d of depthMarks) if (depthTimes[d] === null && s.depth >= d) depthTimes[d] = t;
    if (buildMarks.firstMiner === null && s.workers.miner >= 1) buildMarks.firstMiner = t;
    if (buildMarks.firstShaft === null && s.buildings.mineShaft >= 1) buildMarks.firstShaft = t;
    if (buildMarks.brewery === null && s.buildings.brewery >= 1) buildMarks.brewery = t;
    if (buildMarks.brewer === null && s.workers.brewer >= 1) buildMarks.brewer = t;
    if (buildMarks.smelter === null && s.buildings.smelter >= 1) buildMarks.smelter = t;
    if (buildMarks.forge === null && s.buildings.forge >= 1) buildMarks.forge = t;
    if (buildMarks.greatHall === null && s.buildings.greatHall >= 1) buildMarks.greatHall = t;
    if (buildMarks.temple === null && s.buildings.temple >= 1) buildMarks.temple = t;
    if (snapshot30m === null && t >= 1800) snapshot30m = s;

    if (s.depth >= 1000) break;
  }
  if (snapshot30m === null) snapshot30m = s; // run ended before 30 min — use the final state

  const lines: string[] = [];
  lines.push('=== Deep Hold balance report (greedy bot) ===');
  lines.push(`Sim horizon: ${SIM_HOURS}h game time, step ${STEP_SEC}s, careful dig only`);
  lines.push('');
  lines.push('--- Depth pacing (target: §4 of NEW_GAME_ARCHITECTURE.md) ---');
  for (const d of depthMarks) lines.push(`  ${String(d).padStart(4)} m: ${fmt(depthTimes[d])}`);
  lines.push('');
  lines.push('--- First acquisitions ---');
  for (const [k, v] of Object.entries(buildMarks)) lines.push(`  ${k.padEnd(11)}: ${fmt(v)}`);
  lines.push('');
  lines.push('--- Ale health ---');
  lines.push(`  time striking : ${fmt(strikingSec)}`);
  lines.push(`  avg net ale   : ${(netAleSum / totalSteps).toFixed(3)}/s`);
  lines.push('');
  lines.push(`--- Meaningful purchases in first 10 min: ${purchasesFirst10m} ---`);
  lines.push('');
  lines.push('--- Phase 3 retention loop ---');
  lines.push(`  royal orders claimed : ${orderClaims}`);
  lines.push(`  expeditions started  : ${expeditionStarts}`);
  lines.push(`  expeditions claimed  : ${expeditionClaims}`);
  lines.push(`  active orders final  : ${s.activeOrders.length}`);
  lines.push('');
  if (snapshot30m) {
    lines.push('--- Offline outcomes (from the 30-minute snapshot) ---');
    for (const hours of [1, 4, 12]) {
      const { summary } = simulateOffline(snapshot30m, hours * 3600, NOW0 + 100 * 3600 * 1000);
      const gained = Object.entries(summary.gained)
        .filter(([, v]) => v >= 1)
        .map(([k, v]) => `${k} +${Math.round(v)}`)
        .join(', ');
      lines.push(`  ${String(hours).padStart(2)}h away: dug ${summary.metersDug.toFixed(1)} m; ${gained || 'no gains'}`);
    }
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
});
