import { expect, test } from 'vitest';
import { advanceCart, cartTripSec, idleCart } from './cart';
import { BALANCE } from '../config/balance';
import type { CartState, Cost } from './types';

const cfg = BALANCE.cart;

function run(cart: CartState, buffer: Cost, dt: number, depth = 100, shaft = 0) {
  return advanceCart(cart, buffer, dt, depth, shaft);
}

test('cartTripSec clamps and speeds up with Mine Shaft levels', () => {
  expect(cartTripSec(0, 0)).toBe(cfg.minTripSec);
  expect(cartTripSec(1e6, 0)).toBe(cfg.maxTripSec);
  const mid = cfg.speedMps * 10; // depth that takes exactly 10 s at base speed
  expect(cartTripSec(mid, 0)).toBeCloseTo(10);
  expect(cartTripSec(mid, 2)).toBeCloseTo(10 / (1 + cfg.shaftSpeedPerLevel * 2));
});

test('idle cart stays put while the buffer is empty', () => {
  const { cart, buffer, delivered } = run(idleCart(), {}, 3600);
  expect(cart.phase).toBe('loading');
  expect(cart.phaseLeftSec).toBe(0);
  expect(buffer).toEqual({});
  expect(delivered).toBeNull();
});

test('a full cycle takes the buffer up and credits it only at unload end', () => {
  let cart = idleCart();
  let buffer: Cost = { stone: 10, ore: 2 };

  // start loading
  let r = run(cart, buffer, 0.1);
  expect(r.cart.phase).toBe('loading');
  expect(r.cart.phaseLeftSec).toBeGreaterThan(0);
  expect(r.delivered).toBeNull();

  // finish loading -> departs with the whole buffer
  r = run(r.cart, r.buffer, cfg.loadSec);
  expect(r.cart.phase).toBe('up');
  expect(r.cart.load).toEqual({ stone: 10, ore: 2 });
  expect(r.cart.tripDepth).toBe(100);
  expect(r.buffer).toEqual({});
  expect(r.delivered).toBeNull();

  // ride up (not delivered yet)
  r = run(r.cart, r.buffer, cartTripSec(100, 0));
  expect(r.cart.phase).toBe('unloading');
  expect(r.delivered).toBeNull();

  // unloading completes -> delivery, then heads down empty
  r = run(r.cart, r.buffer, cfg.unloadSec);
  expect(r.cart.phase).toBe('down');
  expect(r.cart.load).toBeNull();
  expect(r.delivered).toEqual({ stone: 10, ore: 2 });
  expect(r.cart.lastDelivery).toEqual({ stone: 10, ore: 2 });

  // back at the face, idle again (buffer still empty)
  r = run(r.cart, r.buffer, cartTripSec(100, 0) * cfg.downMult);
  expect(r.cart.phase).toBe('loading');
  expect(r.cart.phaseLeftSec).toBe(0);
});

test('ore mined during the trip waits for the next run', () => {
  let r = run(idleCart(), { stone: 5 }, cfg.loadSec + 0.1); // departed
  expect(r.cart.phase).toBe('up');
  // new stone lands in the buffer mid-flight
  const midFlight = run(r.cart, { stone: 7 }, 0.1);
  expect(midFlight.cart.load).toEqual({ stone: 5 });
  expect(midFlight.buffer).toEqual({ stone: 7 });
});

test('one huge dt catches up over multiple full cycles', () => {
  // buffer refilled once at the start; a whole day of dt must terminate and
  // deliver exactly once (buffer is only taken at the first departure)
  const r = run(idleCart(), { stone: 12 }, 86400, 50, 1);
  expect(r.cart.phase).toBe('loading');
  expect(r.cart.phaseLeftSec).toBe(0);
  expect(r.buffer).toEqual({});
  expect(r.delivered).toEqual({ stone: 12 });
});

test('tiny fractional buffer below 1 does not trigger a pointless trip', () => {
  const r = run(idleCart(), { stone: 0.4 }, 60);
  expect(r.cart.phase).toBe('loading');
  expect(r.delivered).toBeNull();
  expect(r.buffer).toEqual({ stone: 0.4 });
});
