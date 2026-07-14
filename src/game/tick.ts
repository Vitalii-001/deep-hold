import type { GameState, ResourceId } from './types';
import { BALANCE } from '../config/balance';
import { WORKERS } from '../config/workers';
import { layerAtDepth } from '../config/layers';
import { MILESTONES } from '../config/milestones';
import { aleStorage, digSpeed, statMult, caveInChancePerSec } from './economy';

export function simulateTick(
  s: GameState,
  dt: number,
  now: number,
  rng: () => number = Math.random,
): GameState {
  const res = { ...s.resources };
  const totalWorkers = s.workers.miner + s.workers.smith + s.workers.brewer + s.workers.scout;

  // --- ale cycle: morale requires ale on hand to cover this tick's thirst, then drink
  const thirst = (totalWorkers * BALANCE.ale.consumptionPerWorker * dt) / statMult(s, 'aleThrift', now);
  const merry = res.ale >= thirst; // covers zero-worker case: 0 >= 0
  res.ale = Math.max(0, res.ale - thirst);
  const morale = merry ? BALANCE.ale.happyMult : BALANCE.ale.strikeMult;
  const stun = s.caveInUntil > now ? BALANCE.dig.caveIn.stunMult : 1;
  const workMult = morale * stun;

  // --- mining (stone + current layer's secondary yields)
  const layer = layerAtDepth(s.depth);
  const mined = s.workers.miner * WORKERS.miner.baseRate * statMult(s, 'mining', now) * workMult * dt;
  res.stone += mined;
  for (const [rid, ratio] of Object.entries(layer.yields)) {
    res[rid as ResourceId] += mined * (ratio as number);
  }

  // --- smelting (2 ore -> 1 ingot), bounded by available ore
  const conversions = Math.min(
    s.workers.smith * WORKERS.smith.baseRate * statMult(s, 'smelt', now) * workMult * dt,
    res.ore / BALANCE.smelt.orePerIngot,
  );
  res.ore -= conversions * BALANCE.smelt.orePerIngot;
  res.ingot += conversions;

  // --- brewing, capped by storage
  const brewed = s.workers.brewer * WORKERS.brewer.baseRate * statMult(s, 'brew', now) * workMult * dt;
  res.ale = Math.min(aleStorage(s), res.ale + brewed);

  // --- digging + cave-in risk (reckless only)
  let caveInUntil = s.caveInUntil;
  if (s.digMode === 'reckless' && s.caveInUntil <= now) {
    const chance = caveInChancePerSec(s) * dt;
    if (rng() < chance) {
      caveInUntil = now + BALANCE.dig.caveIn.stunSec * 1000;
      res.stone *= 1 - BALANCE.dig.caveIn.stoneLossRatio;
    }
  }
  const depth = s.depth + digSpeed(s, now) * workMult * dt;

  // --- milestones
  let milestonesReached = s.milestonesReached;
  for (const m of MILESTONES) {
    if (depth >= m.depth && !milestonesReached.includes(m.id)) {
      if (milestonesReached === s.milestonesReached) milestonesReached = [...milestonesReached];
      milestonesReached.push(m.id);
    }
  }

  return { ...s, resources: res, depth, caveInUntil, milestonesReached };
}
