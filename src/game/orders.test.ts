import { expect, test } from 'vitest';
import { initialState } from './store';
import {
  applyOrderClaim,
  applyOrderReroll,
  orderStatus,
  refillOrders,
  tickOrders,
} from './orders';
import type { GameState } from './types';

function richState(over: Partial<GameState> = {}): GameState {
  const s = { ...initialState(), ...over };
  s.resources = { stone: 10_000, ore: 10_000, ingot: 10_000, gold: 10_000, gem: 10_000, ale: 10_000 };
  return s;
}

test('refillOrders draws up to the active order cap from unlocked templates', () => {
  const s = initialState();
  s.resources.stone = 0;
  const active = refillOrders(s, () => 0);
  expect(active.length).toBeGreaterThan(0);
  expect(active.length).toBeLessThanOrEqual(3);
  expect(active[0].templateId).toBe('wallStone');
});

test('tickOrders decrements game-time and drops expired orders without penalty', () => {
  const s = richState({ activeOrders: [{ templateId: 'wallStone', remainingSec: 10 }] });
  const mid = tickOrders(s, 4);
  expect(mid?.[0].remainingSec).toBe(6);
  const expired = tickOrders(s, 11);
  expect(expired).toEqual([]);
});

test('claiming a deliver order consumes delivery, grants reward, and records history', () => {
  const s = richState({ activeOrders: [{ templateId: 'wallStone', remainingSec: 100 }] });
  s.resources.ale = 5; // below storage so the +40 ale reward is fully received
  const beforeStone = s.resources.stone;
  const status = orderStatus(s, s.activeOrders[0]);
  expect(status?.claimable).toBe(true);
  const next = applyOrderClaim(s, 'wallStone');
  expect(next.resources.stone).toBe(beforeStone - 500);
  expect(next.resources.ale).toBe(45);
  expect(next.activeOrders).toEqual([]);
  expect(next.ordersCompleted).toEqual(['wallStone']);
});

test('ale rewards are capped by storage but never take ale away', () => {
  const s = richState({ activeOrders: [{ templateId: 'wallStone', remainingSec: 100 }] });
  s.resources.ale = 10_000; // already far above the 50 storage
  const next = applyOrderClaim(s, 'wallStone');
  expect(next.resources.ale).toBe(10_000); // capped: no gain, but nothing lost
});

test('claiming a modifier order grants the permanent modifier once', () => {
  const s = richState({ depth: 120, activeOrders: [{ templateId: 'smithsOre', remainingSec: 100 }] });
  const next = applyOrderClaim(s, 'smithsOre');
  expect(next.permanentBonuses).toContain('ironPact');
  const again = applyOrderClaim({ ...next, activeOrders: [{ templateId: 'smithsOre', remainingSec: 100 }] }, 'smithsOre');
  expect(again.permanentBonuses.filter((id) => id === 'ironPact')).toHaveLength(1);
});

test('reroll replaces the selected order through the same drawable pool', () => {
  const s = richState({ depth: 200, activeOrders: [{ templateId: 'wallStone', remainingSec: 100 }] });
  const next = applyOrderReroll(s, 'wallStone', () => 0.99);
  expect(next.activeOrders.some((o) => o.templateId === 'wallStone')).toBe(false);
  expect(next.activeOrders.length).toBeGreaterThan(0);
});

test('resource orders are repeatable; modifier orders stay one-time', () => {
  // completed resource order comes back — the board must never run dry
  const s = initialState();
  s.resources.stone = 0;
  s.ordersCompleted = ['wallStone'];
  const refilled = refillOrders(s, () => 0);
  expect(refilled.some((o) => o.templateId === 'wallStone')).toBe(true);

  // a modifier order whose bonus is already owned is never offered again
  const owned = initialState();
  owned.resources.stone = 0;
  owned.depth = 80;
  owned.resources.ore = 0;
  owned.permanentBonuses = ['ironPact'];
  const pool = refillOrders(owned, () => 0);
  expect(pool.some((o) => o.templateId === 'smithsOre')).toBe(false);
});
