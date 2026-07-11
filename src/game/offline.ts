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

  let cur: GameState = { ...s, digMode: 'careful', buildings: { ...s.buildings, brewery: 1000000 } };
  let t = 0;
  while (t < capped) {
    const step = Math.min(BALANCE.offline.chunkSec, capped - t);
    cur = simulateTick(cur, step * rate, now, noCaveIn);
    t += step;
  }
  cur = { ...cur, digMode: s.digMode, buildings: s.buildings };

  const gained = {} as Record<ResourceId, number>;
  for (const k of Object.keys(s.resources) as ResourceId[]) {
    gained[k] = cur.resources[k] - s.resources[k];
  }
  return {
    state: cur,
    summary: { elapsedSec: capped, gained, metersDug: cur.depth - s.depth },
  };
}