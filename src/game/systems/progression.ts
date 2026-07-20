import { MILESTONES } from '../../config/milestones';
import { BREW_MODES } from '../../config/brewModes';
import { SURVEY, SURVEY_BONUSES } from '../../config/survey';
import { nextLayer } from '../../config/layers';
import { applyCharterCompletions } from '../charter';
import { getNextPendingDiscovery, getNextStrangeDiscovery } from '../discoveries';
import { refillOrders, tickOrders } from '../orders';
import { tickExpeditions } from '../expeditions';
import { surveySpeedMult } from '../economy';
import { finalize, type TickContext } from './context';
import type { GameState } from '../types';

// Milestones, Royal Charter completions and discovery queueing. This system
// finalizes the context into a GameState because charter/discovery helpers
// operate on full states. Phase 3 adds Royal Orders (game-time) here.
export function applyProgressionSystem(ctx: TickContext): GameState {
  // milestones
  let milestonesReached = ctx.milestonesReached;
  for (const m of MILESTONES) {
    if (ctx.depth >= m.depth && !milestonesReached.includes(m.id)) {
      if (milestonesReached === ctx.milestonesReached) milestonesReached = [...milestonesReached];
      milestonesReached.push(m.id);
    }
  }
  ctx.milestonesReached = milestonesReached;

  let out = finalize(ctx);

  // Royal Charter goals (sequential; grants rewards, works offline too)
  out = applyCharterCompletions(out);

  // depth discoveries: queue the next unseen one for the modal
  const discovery = getNextPendingDiscovery(out);
  if (discovery) out = { ...out, pendingDiscoveryId: discovery.id };

  // glowbrew strange events (§6.2): rare chance roll while the mode is active
  const strangeChance = BREW_MODES[out.brewMode].strangeChancePerSec;
  if (strangeChance && !out.pendingDiscoveryId) {
    const p = 1 - Math.exp(-strangeChance * ctx.dt);
    if (ctx.rng() < p) {
      const strange = getNextStrangeDiscovery(out);
      if (strange) out = { ...out, pendingDiscoveryId: strange.id };
    }
  }

  // scout survey (Phase 2.3): scouts chart the NEXT layer; at 100% a permanent
  // bonus is rolled for it (Rich Vein / Stable Tunnel / Wet Crack / Ancient Cache)
  const target = nextLayer(out.depth);
  if (target && out.workers.scout > 0 && out.surveyBonuses[target.id] === undefined) {
    const gained = out.workers.scout * SURVEY.pctPerScoutPerSec * surveySpeedMult(out) * ctx.dt;
    const progress = Math.min(100, (out.surveyProgress[target.id] ?? 0) + gained);
    if (progress >= 100) {
      const bonus = SURVEY_BONUSES[Math.floor(ctx.rng() * SURVEY_BONUSES.length) % SURVEY_BONUSES.length];
      const resources =
        bonus.id === 'ancientCache'
          ? { ...out.resources, gold: out.resources.gold + SURVEY.ancientCacheGold }
          : out.resources;
      out = {
        ...out,
        resources,
        surveyProgress: { ...out.surveyProgress, [target.id]: 100 },
        surveyBonuses: { ...out.surveyBonuses, [target.id]: bonus.id },
      };
    } else {
      out = { ...out, surveyProgress: { ...out.surveyProgress, [target.id]: progress } };
    }
  }

  // Royal Orders (Phase 3.2): game-time countdown + expiry, then top up the
  // board. Offline restores activeOrders wholesale (§6.5), so this is a no-op
  // for the player's away time.
  const ticked = tickOrders(out, ctx.dt);
  if (ticked) out = { ...out, activeOrders: ticked };
  const refilled = refillOrders(out, ctx.rng);
  if (refilled !== out.activeOrders) out = { ...out, activeOrders: refilled }; // stable ref when unchanged

  // Return timers (Phase 3.4): live ticks reduce timers; offline applies an
  // extra wall-clock top-up in simulateOffline because these are retention
  // timers, not production-rate timers.
  out = tickExpeditions(out, ctx.dt);

  return out;
}
