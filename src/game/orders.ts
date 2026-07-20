import type { ActiveOrder, Cost, GameState, ResourceId } from './types';
import { MAX_ACTIVE_ORDERS, ORDER_MAP, ORDERS, type OrderConfig } from '../config/orders';
import { MODIFIERS } from '../config/modifiers';
import { aleStorage, canAfford, payCost } from './economy';

const ORDER_HISTORY_CAP = 50;

export interface OrderStatus {
  order: ActiveOrder;
  config: OrderConfig;
  current: number;
  target: number;
  complete: boolean;
  claimable: boolean; // complete AND (for deliver orders) affordable to hand over
}

export function orderStatus(s: GameState, order: ActiveOrder): OrderStatus | null {
  const config = ORDER_MAP[order.templateId];
  if (!config) return null;
  const { current, target } = config.progress(s);
  const complete = current >= target;
  const claimable = complete && (!config.deliver || canAfford(s.resources, config.deliver));
  return { order, config, current, target, complete, claimable };
}

// A template is drawable if it's unlocked by depth, not already active, its
// modifier reward (if any) is not already owned, and it isn't already satisfied
// (so "reach 300 m" never spawns already-complete once you're deeper).
// Resource-reward orders are repeatable (the "one more contract" retention
// hook must never run dry); modifier orders are one-time via permanentBonuses.
// ordersCompleted is history for UI/records, NOT an offering filter — with a
// small template pool it would permanently empty the board.
function drawable(s: GameState, active: ActiveOrder[]): OrderConfig[] {
  const activeIds = new Set(active.map((o) => o.templateId));
  return ORDERS.filter((o) => {
    if (o.minDepth > s.depth) return false;
    if (activeIds.has(o.id)) return false;
    if (o.reward.modifier && s.permanentBonuses.includes(o.reward.modifier)) return false;
    const { current, target } = o.progress(s);
    return current < target;
  });
}

// Tops the board up to MAX_ACTIVE_ORDERS. Pure — rng picks from the eligible
// pool. Returns the SAME array reference when nothing is added, so per-tick
// callers don't churn state / re-render subscribers.
export function refillOrders(s: GameState, rng: () => number): ActiveOrder[] {
  const active = [...s.activeOrders];
  let added = false;
  while (active.length < MAX_ACTIVE_ORDERS) {
    const pool = drawable(s, active);
    if (pool.length === 0) break;
    const pick = pool[Math.floor(rng() * pool.length) % pool.length];
    active.push({ templateId: pick.id, remainingSec: pick.durationSec });
    added = true;
  }
  return added ? active : s.activeOrders;
}

// Per-tick game-time countdown + expiry (penalty-free). Returns null when
// nothing changed so callers can skip a state copy.
export function tickOrders(s: GameState, dt: number): ActiveOrder[] | null {
  if (s.activeOrders.length === 0) return null;
  let changed = false;
  const kept: ActiveOrder[] = [];
  for (const o of s.activeOrders) {
    const remainingSec = o.remainingSec - dt;
    if (remainingSec <= 0) {
      changed = true; // expired — dropped, refilled next pass
      continue;
    }
    if (remainingSec !== o.remainingSec) changed = true;
    kept.push({ ...o, remainingSec });
  }
  return changed ? kept : null;
}

function grant(res: Record<ResourceId, number>, reward: Cost): Record<ResourceId, number> {
  const out = { ...res };
  for (const [k, v] of Object.entries(reward)) out[k as ResourceId] += v as number;
  return out;
}

// Claims a completed order: consumes the deliver cost, grants resources and/or a
// permanent modifier, removes the order. Pure; returns input unchanged if the
// order isn't claimable.
export function applyOrderClaim(s: GameState, templateId: string): GameState {
  const active = s.activeOrders.find((o) => o.templateId === templateId);
  if (!active) return s;
  const status = orderStatus(s, active);
  if (!status || !status.claimable) return s;

  let resources = status.config.deliver ? payCost(s.resources, status.config.deliver) : { ...s.resources };
  if (status.config.reward.resources) {
    const before = resources.ale;
    resources = grant(resources, status.config.reward.resources);
    if (status.config.reward.resources.ale) {
      // ale rewards respect storage (same rule as charter/discoveries) but never take ale away
      resources.ale = Math.max(before, Math.min(aleStorage(s), resources.ale));
    }
  }

  let permanentBonuses = s.permanentBonuses;
  const mod = status.config.reward.modifier;
  if (mod && MODIFIERS[mod] && !permanentBonuses.includes(mod)) {
    permanentBonuses = [...permanentBonuses, mod];
  }

  return {
    ...s,
    resources,
    permanentBonuses,
    activeOrders: s.activeOrders.filter((o) => o.templateId !== templateId),
    ordersCompleted: [...(s.ordersCompleted ?? []), templateId].slice(-ORDER_HISTORY_CAP),
  };
}

// Reroll one order for a fresh draw (free alternative to the ad reroll).
export function applyOrderReroll(s: GameState, templateId: string, rng: () => number): GameState {
  if (!s.activeOrders.some((o) => o.templateId === templateId)) return s;
  const without = { ...s, activeOrders: s.activeOrders.filter((o) => o.templateId !== templateId) };
  return { ...without, activeOrders: refillOrders(without, rng) };
}
