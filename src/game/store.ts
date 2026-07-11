import { create } from 'zustand';
import type { BuildingId, DigMode, GameState, WorkerId } from './types';
import { BALANCE } from '../config/balance';
import { BUILDINGS } from '../config/buildings';
import { UPGRADES } from '../config/upgrades';
import { buildingCost, canAfford, payCost, statMult, workerCap, workerCost } from './economy';
import { simulateTick } from './tick';

export function initialState(): GameState {
  return {
    resources: { stone: 0, ore: 0, ingot: 0, gold: 0, gem: 0, ale: BALANCE.ale.initialAle },
    workers: { miner: 0, smith: 0, brewer: 0, scout: 0 },
    buildings: { mineShaft: 0, smelter: 0, forge: 0, brewery: 0, greatHall: 0, temple: 0 },
    upgrades: [],
    depth: 0,
    milestonesReached: [],
    digMode: 'careful',
    caveInUntil: 0,
    blessingUntil: 0,
    muted: false,
  };
}

export interface GameStore extends GameState {
  clickMine: () => void;
  hireWorker: (id: WorkerId) => void;
  buildBuilding: (id: BuildingId) => void;
  buyUpgrade: (id: string) => void;
  setDigMode: (m: DigMode) => void;
  toggleMuted: () => void;
  hydrate: (s: GameState) => void;
  tick: (dt: number, now?: number, rng?: () => number) => void;
}

export const useGame = create<GameStore>()((set) => ({
  ...initialState(),

  clickMine: () =>
    set((s) => ({
      resources: {
        ...s.resources,
        stone: s.resources.stone + BALANCE.click.stonePerClick * statMult(s, 'click', Date.now()),
      },
    })),

  hireWorker: (id) =>
    set((s) => {
      const cost = workerCost(s, id);
      if (s.workers[id] >= workerCap(s, id) || !canAfford(s.resources, cost)) return s;
      return {
        resources: payCost(s.resources, cost),
        workers: { ...s.workers, [id]: s.workers[id] + 1 },
      };
    }),

  buildBuilding: (id) =>
    set((s) => {
      const cfg = BUILDINGS[id];
      if (s.buildings[id] >= cfg.maxLevel || s.depth < cfg.unlockDepth) return s;
      const cost = buildingCost(s, id);
      if (!canAfford(s.resources, cost)) return s;
      return {
        resources: payCost(s.resources, cost),
        buildings: { ...s.buildings, [id]: s.buildings[id] + 1 },
      };
    }),

  buyUpgrade: (id) =>
    set((s) => {
      const u = UPGRADES[id];
      if (!u || s.upgrades.includes(id) || s.depth < u.unlockDepth) return s;
      if (u.requiresBuilding && s.buildings[u.requiresBuilding] < 1) return s;
      if (!canAfford(s.resources, u.cost)) return s;
      return { resources: payCost(s.resources, u.cost), upgrades: [...s.upgrades, id] };
    }),

  setDigMode: (m) => set({ digMode: m }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  hydrate: (ns) => set(() => ns),
  tick: (dt, now = Date.now(), rng = Math.random) => set((s) => simulateTick(s, dt, now, rng)),
}));