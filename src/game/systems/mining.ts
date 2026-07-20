import { WORKERS } from '../../config/workers';
import { layerAtDepth } from '../../config/layers';
import { SURVEY } from '../../config/survey';
import { currentMethod, statMult } from '../economy';
import type { ResourceId } from '../types';
import type { TickContext } from './context';

// Miners produce stone plus the current layer's secondary yields, both scaled
// by the mining method (value-over-volume: Selective trades stone for veins,
// Bulk the other way) and the layer's Rich Vein survey bonus if rolled.
export function applyMiningSystem(ctx: TickContext): TickContext {
  const s = ctx.prev;
  // Mined output accrues at the dig face and is only credited to resources
  // when the cart hauls it up (systems/cart.ts).
  const buf = ctx.cartBuffer;

  const layer = layerAtDepth(s.depth);
  const method = currentMethod(s);
  const baseMined = s.workers.miner * WORKERS.miner.baseRate * statMult(s, 'mining', ctx.now) * ctx.workMult * ctx.dt;
  const stone = baseMined * method.stoneMult;
  buf.stone = (buf.stone ?? 0) + stone;
  ctx.stoneMined = stone;

  const richVein = s.surveyBonuses[layer.id] === 'richVein' ? SURVEY.richVeinYieldMult : 1;
  for (const [rid, ratio] of Object.entries(layer.baseYield)) {
    const gained = baseMined * (ratio as number) * method.secondaryMult * richVein;
    buf[rid as ResourceId] = (buf[rid as ResourceId] ?? 0) + gained;
    if (rid === 'ore') ctx.oreMined += gained;
    if (rid === 'gold') ctx.goldMined += gained;
  }

  return ctx;
}
