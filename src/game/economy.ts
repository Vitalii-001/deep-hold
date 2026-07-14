import type { BuildingId, Cost, GameState, ResourceId, StatId, WorkerId } from './types';
import { BALANCE } from '../config/balance';
import { WORKERS } from '../config/workers';
import { BUILDINGS } from '../config/buildings';
import { UPGRADES } from '../config/upgrades';

const PRODUCTION_STATS: StatId[] = ['mining', 'click', 'smelt', 'brew'];

export function scaledCost(base: Cost, growth: number, owned: number): Cost {
  const out: Cost = {};
  for (const [k, v] of Object.entries(base)) {
    out[k as ResourceId] = Math.ceil((v as number) * Math.pow(growth, owned));
  }
  return out;
}

export function canAfford(res: Record<ResourceId, number>, cost: Cost): boolean {
  return Object.entries(cost).every(([k, v]) => res[k as ResourceId] >= (v as number));
}

export function payCost(res: Record<ResourceId, number>, cost: Cost): Record<ResourceId, number> {
  const out = { ...res };
  for (const [k, v] of Object.entries(cost)) out[k as ResourceId] -= v as number;
  return out;
}

export function totalWorkers(s: GameState): number {
  return s.workers.miner + s.workers.smith + s.workers.brewer + s.workers.scout;
}

export function workerCost(s: GameState, id: WorkerId): Cost {
  const w = WORKERS[id];
  return scaledCost(w.baseCost, w.costGrowth, s.workers[id]);
}

export function buildingCost(s: GameState, id: BuildingId): Cost {
  const b = BUILDINGS[id];
  return scaledCost(b.baseCost, b.costGrowth, s.buildings[id]);
}

export function workerCap(s: GameState, id: WorkerId): number {
  const cap = BALANCE.caps[id];
  return cap.base + cap.perLevel * s.buildings[cap.building];
}

export function aleStorage(s: GameState): number {
  return BALANCE.ale.storageBase + BALANCE.ale.storagePerBreweryLevel * s.buildings.brewery;
}

export function statMult(s: GameState, stat: StatId, now: number): number {
  let m = 1;
  for (const id of s.upgrades) {
    const u = UPGRADES[id];
    if (u && u.stat === stat) m *= u.mult;
  }
  if (PRODUCTION_STATS.includes(stat)) {
    m *= Math.pow(BALANCE.production.greatHallMultPerLevel, s.buildings.greatHall);
    m *= Math.pow(BALANCE.production.templeMultPerLevel, s.buildings.temple);
    if (s.blessingUntil > now) m *= BALANCE.blessing.mult;
  }
  if (stat === 'mining') {
    m *= Math.pow(BALANCE.production.forgeMultPerLevel, s.buildings.forge);
  }
  return m;
}

export function digSpeed(s: GameState, now: number): number {
  let v =
    (BALANCE.dig.baseSpeed +
      s.workers.miner * BALANCE.dig.perMiner +
      s.workers.scout * BALANCE.dig.perScout) *
    statMult(s, 'dig', now);
  if (s.digMode === 'reckless') v *= BALANCE.dig.recklessMult;
  return v;
}

// Chance of a cave-in per second of reckless digging (0 in careful mode).
export function caveInChancePerSec(s: GameState): number {
  if (s.digMode !== 'reckless') return 0;
  return (
    BALANCE.dig.caveIn.chancePerSec *
    Math.pow(1 - BALANCE.dig.caveIn.templeReductionPerLevel, s.buildings.temple)
  );
}

// True when at least one dwarf is working and there isn't enough ale to cover
// one ~0.1s tick of thirst. Pure: 'aleThrift' is not a production stat, so the
// `now` passed to statMult never changes the result.
export function isStriking(s: GameState): boolean {
  const workers = totalWorkers(s);
  if (workers === 0) return false;
  const drink = (workers * BALANCE.ale.consumptionPerWorker) / statMult(s, 'aleThrift', 0);
  return s.resources.ale < drink * 0.1;
}
