import { BALANCE } from '../../config/balance';
import { WORKERS } from '../../config/workers';
import { BREW_MODES } from '../../config/brewModes';
import { layerAtDepth } from '../../config/layers';
import { aleDrinkRate, aleStorage, brewerMoraleMult, moraleInfo, statMult } from '../economy';
import { aleSeepPerSec } from '../layerFeatures';
import type { TickContext } from './context';

// Ale cycle: smooth morale from the pre-drink ale level, dwarves drink, brewers
// refill up to storage. Sets ctx.workMult for every downstream system.
// Brewers are morale-immune ("brewers drink first") so strikes stay escapable.
export function applyAleSystem(ctx: TickContext): TickContext {
  const s = ctx.prev;
  const res = ctx.resources;

  const morale = moraleInfo(s);
  const stun = s.caveInUntil > ctx.now ? BALANCE.dig.caveIn.stunMult : 1;
  ctx.merry = morale.state === 'merry' || morale.state === 'idle';
  ctx.workMult = morale.mult * stun;

  const thirst = aleDrinkRate(s, ctx.now) * ctx.dt; // method-aware (Bulk crews drink more)
  ctx.aleConsumed = Math.min(res.ale, thirst);
  res.ale = Math.max(0, res.ale - thirst);

  // brewing: morale-immune, scaled by the active brew mode, capped by storage
  const brewWorkMult = brewerMoraleMult(s) * stun;
  const brewed =
    s.workers.brewer *
    WORKERS.brewer.baseRate *
    BREW_MODES[s.brewMode].brewRateMult *
    statMult(s, 'brew', ctx.now) *
    brewWorkMult *
    ctx.dt;
  const before = res.ale;
  res.ale = Math.min(aleStorage(s), res.ale + brewed);
  ctx.aleBrewed = res.ale - before;

  // Layer signature (§2) — Mushroom Grotto spores seep a little ale into the
  // cellar. Environmental, so it is capped by storage but not counted as
  // brewer output (records stay brewer-focused).
  const seep = aleSeepPerSec(layerAtDepth(s.depth).id) * ctx.dt;
  if (seep > 0) res.ale = Math.min(aleStorage(s), res.ale + seep);

  return ctx;
}
