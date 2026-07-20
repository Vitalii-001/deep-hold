import type { CartState, Cost, ResourceId } from './types';
import { BALANCE } from '../config/balance';

// Haul-cycle cart (spec 2026-07-19-cart-courier-design.md). Pure state
// machine: loading → up → unloading (delivery) → down → loading. All timers
// count REMAINING seconds and are advanced by dt, so the machine is oblivious
// to wall clocks and survives the offline playedSec restore. Loop-safe: one
// large dt walks through as many phases/cycles as it covers.

export function idleCart(): CartState {
  return { phase: 'loading', phaseLeftSec: 0, tripDepth: 0, load: null, lastDelivery: null };
}

export function cartTripSec(depth: number, mineShaftLevel: number): number {
  const cfg = BALANCE.cart;
  const speed = cfg.speedMps * (1 + cfg.shaftSpeedPerLevel * mineShaftLevel);
  return Math.min(cfg.maxTripSec, Math.max(cfg.minTripSec, depth / speed));
}

function bufferTotal(buffer: Cost): number {
  let sum = 0;
  for (const v of Object.values(buffer)) sum += v;
  return sum;
}

function addCost(into: Cost, from: Cost): Cost {
  const out: Cost = { ...into };
  for (const [rid, v] of Object.entries(from) as [ResourceId, number][]) {
    out[rid] = (out[rid] ?? 0) + v;
  }
  return out;
}

export interface CartAdvance {
  cart: CartState;
  buffer: Cost;
  delivered: Cost | null; // total credited during this advance (may span cycles)
}

export function advanceCart(
  cartIn: CartState,
  bufferIn: Cost,
  dt: number,
  depth: number,
  mineShaftLevel: number,
): CartAdvance {
  const cfg = BALANCE.cart;
  let cart = { ...cartIn };
  let buffer = bufferIn;
  let delivered: Cost | null = null;
  let left = dt;

  // A departure needs at least 1 unit total — a dribble of dust is not a haul.
  if (cart.phase === 'loading' && cart.phaseLeftSec <= 0) {
    if (bufferTotal(buffer) < 1) return { cart: cartIn, buffer, delivered: null };
    cart.phaseLeftSec = cfg.loadSec;
  }

  while (left > 0) {
    if (cart.phaseLeftSec > left) {
      cart.phaseLeftSec -= left;
      break;
    }
    left -= cart.phaseLeftSec;

    switch (cart.phase) {
      case 'loading':
        // depart with the whole buffer
        cart = {
          ...cart,
          phase: 'up',
          phaseLeftSec: cartTripSec(depth, mineShaftLevel),
          tripDepth: depth,
          load: buffer,
        };
        buffer = {};
        break;
      case 'up':
        cart = { ...cart, phase: 'unloading', phaseLeftSec: cfg.unloadSec };
        break;
      case 'unloading': {
        const batch = cart.load ?? {};
        delivered = delivered ? addCost(delivered, batch) : { ...batch };
        cart = {
          ...cart,
          phase: 'down',
          phaseLeftSec: cartTripSec(cart.tripDepth, mineShaftLevel) * cfg.downMult,
          load: null,
          lastDelivery: { ...batch },
        };
        break;
      }
      case 'down':
        if (bufferTotal(buffer) < 1) {
          // idle at the face until the miners pile up something worth hauling
          cart = { ...cart, phase: 'loading', phaseLeftSec: 0 };
          return { cart, buffer, delivered };
        }
        cart = { ...cart, phase: 'loading', phaseLeftSec: cfg.loadSec };
        break;
    }
  }

  return { cart, buffer, delivered };
}
