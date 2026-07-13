import type { GameState, ResourceId } from './types';
import { BALANCE } from '../config/balance';
import { simulateTick } from './tick';
import { statMult } from './economy';

export interface OfflineSummary {
  elapsedSec: number;
  gained: Record<ResourceId, number>;
  metersDug: number;
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
  let cur: GameState = { ...s, digMode: 'careful' };
  let t = 0;
  while (t < capped) {
    const step = Math.min(BALANCE.offline.chunkSec, capped - t);
    cur = simulateTick(cur, step * rate, startMs + (t + step) * 1000, noCaveIn);
    t += step;
  }
  cur = { ...cur, digMode: s.digMode };

  const gained = {} as Record<ResourceId, number>;
  for (const k of Object.keys(s.resources) as ResourceId[]) {
    gained[k] = cur.resources[k] - s.resources[k];
  }
  return {
    state: cur,
    summary: { elapsedSec: capped, gained, metersDug: cur.depth - s.depth },
  };
}
