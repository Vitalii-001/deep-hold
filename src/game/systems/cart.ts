import { advanceCart } from '../cart';
import type { ResourceId } from '../types';
import type { TickContext } from './context';

// Runs the haul-cycle state machine (game/cart.ts) and credits deliveries.
// Sits after dig so a departing cart snapshots the current depth.
export function applyCartSystem(ctx: TickContext): TickContext {
  const { cart, buffer, delivered } = advanceCart(
    ctx.cart,
    ctx.cartBuffer,
    ctx.dt,
    ctx.depth,
    ctx.prev.buildings.mineShaft,
  );
  ctx.cart = cart;
  ctx.cartBuffer = buffer;
  if (delivered) {
    for (const [rid, v] of Object.entries(delivered) as [ResourceId, number][]) {
      ctx.resources[rid] += v;
    }
  }
  return ctx;
}
