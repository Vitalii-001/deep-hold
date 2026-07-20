import type { GameState, ResourceId } from './types';
import { BALANCE } from '../config/balance';
import { simulateTick } from './tick';
import { statMult } from './economy';
import { tickExpeditions } from './expeditions';
import { EXPEDITION_MAP } from '../config/expeditions';
import { recordOfflineBest } from './awards';

export interface OfflineSummary {
  elapsedSec: number;
  gained: Record<ResourceId, number>;
  metersDug: number;
  events: string[];
  ordersPaused: number;
  expeditionsReady: string[];
}

export function simulateOffline(
  s: GameState,
  elapsedSec: number,
  now: number,
): { state: GameState; summary: OfflineSummary } {
  const capped = Math.min(elapsedSec, BALANCE.offline.capHours * 3600);
  const rate = BALANCE.offline.rate * statMult(s, 'offline', now);
  const noCaveIn = () => 1;

  const startMs = now - capped * 1000;
  let cur: GameState = s;
  let t = 0;
  while (t < capped) {
    const step = Math.min(BALANCE.offline.chunkSec, capped - t);
    cur = simulateTick(cur, step * rate, startMs + (t + step) * 1000, noCaveIn);
    t += step;
  }
  // simulateTick already reduced return timers by `elapsed * offlineRate`.
  // Return timers are wall-clock retention hooks, so top them up to the full
  // absence. Royal Orders remain paused by restoring activeOrders below.
  cur = tickExpeditions(cur, Math.max(0, capped * (1 - rate)));
  // playedSec is a game-time clock (orders/feasts pause offline) — restore it.
  // The player's mining method keeps working offline (cave-ins are already
  // suppressed by the noCaveIn rng), so Bulk keeps its yields and thirst.
  cur = { ...cur, playedSec: s.playedSec, activeOrders: s.activeOrders };

  const gained = {} as Record<ResourceId, number>;
  for (const k of Object.keys(s.resources) as ResourceId[]) {
    gained[k] = cur.resources[k] - s.resources[k];
  }
  cur = recordOfflineBest(cur, gained);
  const expeditionsReady = cur.expeditions
    .filter((e) => e.remainingSec <= 0 && (s.expeditions.find((start) => start.templateId === e.templateId)?.remainingSec ?? 0) > 0)
    .map((e) => e.templateId);
  const events: string[] = [];
  if (cur.depth - s.depth >= 0.5) events.push(`The night shift pushed ${Math.floor(cur.depth - s.depth)} m deeper.`);
  if (gained.ale < 0) events.push(`The cellar ran ${Math.abs(Math.floor(gained.ale))} ale lower while the hold worked.`);
  if (gained.ale > 0) events.push(`The brewers left ${Math.floor(gained.ale)} more ale in the cellar.`);
  if (s.activeOrders.length > 0) events.push('Royal Orders were pinned to the wall; their timers paused while you were away.');
  for (const id of expeditionsReady) {
    const title = EXPEDITION_MAP[id]?.title ?? 'A return timer';
    events.push(`${title} is ready to claim.`);
  }
  return {
    state: cur,
    summary: {
      elapsedSec: capped,
      gained,
      metersDug: cur.depth - s.depth,
      events,
      ordersPaused: s.activeOrders.length,
      expeditionsReady,
    },
  };
}
