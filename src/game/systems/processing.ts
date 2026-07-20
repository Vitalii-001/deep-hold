import { BALANCE } from '../../config/balance';
import { WORKERS } from '../../config/workers';
import { smeltCapacity, statMult } from '../economy';
import type { TickContext } from './context';

// Smiths convert ore into ingots (2:1), bounded by available ore AND by the
// smelter's throughput ceiling — the Phase 2 processing bottleneck. When ore
// piles up faster than capacity, getBottlenecks surfaces "Ore backlog".
export function applyProcessingSystem(ctx: TickContext): TickContext {
  const s = ctx.prev;
  const res = ctx.resources;

  const conversions = Math.min(
    s.workers.smith * WORKERS.smith.baseRate * statMult(s, 'smelt', ctx.now) * ctx.workMult * ctx.dt,
    smeltCapacity(s) * ctx.dt,
    res.ore / BALANCE.smelt.orePerIngot,
  );
  res.ore -= conversions * BALANCE.smelt.orePerIngot;
  res.ingot += conversions;
  ctx.ingotsSmelted = conversions;

  return ctx;
}
