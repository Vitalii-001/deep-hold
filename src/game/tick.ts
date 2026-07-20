import type { GameState } from './types';
import { createTickContext } from './systems/context';
import { applyAleSystem } from './systems/ale';
import { applyMiningSystem } from './systems/mining';
import { applyProcessingSystem } from './systems/processing';
import { applyDigSystem } from './systems/dig';
import { applyCartSystem } from './systems/cart';
import { applyProgressionSystem } from './systems/progression';
import { applyAwardSystem } from './awards';

// Simulation pipeline (NEW_GAME_ARCHITECTURE.md §2.1). Order matters: the ale
// system sets the morale work multiplier every downstream system consumes.
// Offline simulation reuses this exact pipeline in small chunks.
export function simulateTick(
  s: GameState,
  dt: number,
  now: number,
  rng: () => number = Math.random,
): GameState {
  let ctx = createTickContext(s, dt, now, rng);
  ctx = applyAleSystem(ctx);
  ctx = applyMiningSystem(ctx);
  ctx = applyProcessingSystem(ctx);
  ctx = applyDigSystem(ctx);
  ctx = applyCartSystem(ctx);
  const out = applyProgressionSystem(ctx); // finalizes into the next GameState
  return applyAwardSystem(ctx, out);
}
