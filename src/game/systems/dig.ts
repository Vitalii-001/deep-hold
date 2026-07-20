import { BALANCE } from '../../config/balance';
import { caveInChancePerSec, digSpeed } from '../economy';
import type { TickContext } from './context';

// Descent + cave-in risk (Bulk mining only — caveInChancePerSec is 0 for safe
// methods). The roll uses the time-step-safe exponential form:
// P(dt) = 1 - e^(-rate*dt), valid for both live ticks and offline chunks.
export function applyDigSystem(ctx: TickContext): TickContext {
  const s = ctx.prev;

  const ratePerSec = caveInChancePerSec(s);
  if (ratePerSec > 0 && s.caveInUntil <= ctx.now) {
    const chance = 1 - Math.exp(-ratePerSec * ctx.dt);
    if (ctx.rng() < chance) {
      ctx.caveInUntil = ctx.now + BALANCE.dig.caveIn.stunSec * 1000;
      ctx.resources.stone *= 1 - BALANCE.dig.caveIn.stoneLossRatio;
      ctx.caveInTriggered = true;
    }
  }

  ctx.depth = s.depth + digSpeed(s, ctx.now) * ctx.workMult * ctx.dt;

  return ctx;
}
