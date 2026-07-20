import type { CartState, Cost, GameState, ResourceId } from '../types';

// Shared mutable context threaded through the tick pipeline (see tick.ts).
// Each system reads the results of the previous ones (ale sets workMult,
// mining/dig consume it) and records deltas for reports/records.
export interface TickContext {
  prev: GameState; // input state — treat as read-only
  dt: number;
  now: number;
  rng: () => number;

  // mutable working copies
  resources: Record<ResourceId, number>;
  cartBuffer: Cost; // mining output lands here; the cart system delivers it
  cart: CartState;
  depth: number;
  caveInUntil: number;
  milestonesReached: string[];

  // set by applyAleSystem, consumed by mining/processing/dig
  merry: boolean;
  workMult: number;

  // per-tick deltas — hooks for records (Phase 4) and richer offline reports
  aleConsumed: number;
  aleBrewed: number;
  stoneMined: number;
  oreMined: number;
  goldMined: number;
  ingotsSmelted: number;
  caveInTriggered: boolean;
}

export function createTickContext(
  s: GameState,
  dt: number,
  now: number,
  rng: () => number,
): TickContext {
  return {
    prev: s,
    dt,
    now,
    rng,
    resources: { ...s.resources },
    cartBuffer: { ...s.cartBuffer },
    cart: s.cart,
    depth: s.depth,
    caveInUntil: s.caveInUntil,
    milestonesReached: s.milestonesReached,
    merry: true,
    workMult: 1,
    aleConsumed: 0,
    aleBrewed: 0,
    stoneMined: 0,
    oreMined: 0,
    goldMined: 0,
    ingotsSmelted: 0,
    caveInTriggered: false,
  };
}

// Assembles the next GameState from the context. Records counters (Phase 4)
// will be accumulated here from the ctx deltas — the hooks already exist.
export function finalize(ctx: TickContext): GameState {
  return {
    ...ctx.prev,
    resources: ctx.resources,
    cartBuffer: ctx.cartBuffer,
    cart: ctx.cart,
    depth: ctx.depth,
    caveInUntil: ctx.caveInUntil,
    milestonesReached: ctx.milestonesReached,
    playedSec: ctx.prev.playedSec + ctx.dt,
  };
}
