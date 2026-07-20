import { create } from 'zustand';
import type { AwardType, BuildingId, Cost, GameState, ResourceId, WorkerId } from './types';
import type { MiningMethodId } from '../config/miningMethods';
import { BALANCE } from '../config/balance';
import { BUILDINGS } from '../config/buildings';
import { UPGRADES } from '../config/upgrades';
import { aleStorage, buildingCost, canAfford, payCost, productionRates, workerCap, workerCost } from './economy';
import type { BrewModeId } from '../config/brewModes';
import { simulateTick } from './tick';
import { DISCOVERY_MAP } from '../config/discoveries';
import { applyDiscoveryChoice } from './discoveries';
import { applyOrderClaim, applyOrderReroll } from './orders';
import {
  claimExpedition as applyExpeditionClaim,
  rushExpedition as applyExpeditionRush,
  startExpedition as applyExpeditionStart,
} from './expeditions';
import { DISPLAYED_ARTIFACT_LIMIT } from '../config/artifacts';
import {
  applyAwards,
  clearNewAwards as clearUnreadAwards,
  recordFeast,
  recordSurveyCompletions,
} from './awards';
import { initialRecords } from './records';
import { rollChunkClickReward } from './mineInteractions';
import { idleCart } from './cart';
import { rollFind } from './finds';
import { appendNewAwards } from './awards';
import { buyMarketPerk as applyBuyMarketPerk, sellResource as applySellResource } from './market';
import type { FindConfig } from '../config/finds';
import { LAYERS, layerAtDepth } from '../config/layers';

export function initialState(): GameState {
  return {
    // Fresh games start with just enough stone to hire the first miner — there is
    // no manual mining, so the dwarves drive everything from that first hire.
    resources: { stone: 15, ore: 0, ingot: 0, gold: 0, gem: 0, ale: BALANCE.ale.initialAle },
    cartBuffer: {},
    cart: idleCart(),
    workers: { miner: 0, smith: 0, brewer: 0, scout: 0 },
    buildings: { mineShaft: 0, smelter: 0, forge: 0, brewery: 0, greatHall: 0, temple: 0, tradingPost: 0 },
    upgrades: [],
    depth: 0,
    milestonesReached: [],
    miningMethod: 'balanced',
    surveyProgress: {},
    surveyBonuses: {},
    caveInUntil: 0,
    blessingUntil: 0,
    muted: false,
    playedSec: 0,
    brewMode: 'thin',
    feastUntilSec: 0,
    feastCooldownUntilSec: 0,
    rallyReadyAtSec: 0,
    tutorialDone: [],
    onboarding: { introSeen: false },
    charterGoalsDone: [],
    discoveriesSeen: [],
    discoveryChoices: {},
    pendingDiscoveryId: null,
    permanentBonuses: [],
    activeOrders: [],
    ordersCompleted: [],
    expeditions: [],
    trophiesEarned: [],
    artifactsFound: [],
    displayedArtifacts: [],
    findsCollected: [],
    crowns: 0,
    marketPerks: [],
    newAwards: [],
    records: initialRecords(),
  };
}

export interface GameStore extends GameState {
  hireWorker: (id: WorkerId) => void;
  buildBuilding: (id: BuildingId) => void;
  buyUpgrade: (id: string) => void;
  setMiningMethod: (m: MiningMethodId) => void;
  toggleMuted: () => void;
  hydrate: (s: GameState) => void;
  tick: (dt: number, now?: number, rng?: () => number) => void;
  claimBlessing: (now?: number) => void;
  claimAleBarrel: () => void;
  completeTutorialStep: (id: string) => void;
  chooseDiscovery: (optionId: string, now?: number, rng?: () => number) => void;
  completeIntro: () => void;
  replayIntro: () => void;
  setBrewMode: (m: BrewModeId) => void;
  holdFeast: () => void;
  rallyMiners: (now?: number) => void;
  claimOrder: (templateId: string) => void;
  rerollOrder: (templateId: string, rng?: () => number) => void;
  startExpedition: (templateId: string) => void;
  claimExpedition: (templateId: string, rng?: () => number) => void;
  rushExpedition: (templateId: string, seconds: number, noCost?: boolean) => void;
  rushFeastCooldown: (seconds: number) => void;
  toggleDisplayedArtifact: (id: string) => void;
  clearNewAwards: (type?: AwardType) => void;
  mineChunkClick: (layerId: string, totalClicks: number, rng?: () => number) => Cost;
  claimChunkFind: (layerId: string, rng?: () => number) => FindConfig | null;
  sellResource: (resource: ResourceId, qty: number) => void;
  buyMarketPerk: (perkId: string) => void;
}

export const useGame = create<GameStore>()((set, get) => ({
  ...initialState(),

  hireWorker: (id) =>
    set((s) => {
      const cost = workerCost(s, id);
      if (s.workers[id] >= workerCap(s, id) || !canAfford(s.resources, cost)) return s;
      // The very first miner breaks ground on the spot — the shaft becomes
      // visible immediately instead of crawling out of 0 m.
      const depth =
        id === 'miner' && s.workers.miner === 0
          ? Math.max(s.depth, BALANCE.dig.firstMinerShaftM)
          : s.depth;
      return applyAwards({
        ...s,
        depth,
        resources: payCost(s.resources, cost),
        workers: { ...s.workers, [id]: s.workers[id] + 1 },
      });
    }),

  buildBuilding: (id) =>
    set((s) => {
      const cfg = BUILDINGS[id];
      if (s.buildings[id] >= cfg.maxLevel || s.depth < cfg.unlockDepth) return s;
      const cost = buildingCost(s, id);
      if (!canAfford(s.resources, cost)) return s;
      return applyAwards({
        ...s,
        resources: payCost(s.resources, cost),
        buildings: { ...s.buildings, [id]: s.buildings[id] + 1 },
      });
    }),

  buyUpgrade: (id) =>
    set((s) => {
      const u = UPGRADES[id];
      if (!u || s.upgrades.includes(id) || s.depth < u.unlockDepth) return s;
      if (u.requiresBuilding && s.buildings[u.requiresBuilding] < 1) return s;
      if (!canAfford(s.resources, u.cost)) return s;
      return applyAwards({ ...s, resources: payCost(s.resources, u.cost), upgrades: [...s.upgrades, id] });
    }),

  setMiningMethod: (m) => set({ miningMethod: m }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  hydrate: (ns) => set(() => ns),
  tick: (dt, now = Date.now(), rng = Math.random) => set((s) => simulateTick(s, dt, now, rng)),

  claimBlessing: (now = Date.now()) =>
    set(() => ({ blessingUntil: now + BALANCE.blessing.durationHours * 3600 * 1000 })),

  claimAleBarrel: () =>
    set((s) => ({
      resources: {
        ...s.resources,
        ale: Math.min(aleStorage(s), s.resources.ale + BALANCE.ale.adBarrelAmount),
      },
    })),

  completeTutorialStep: (id) =>
    set((s) => (s.tutorialDone.includes(id) ? s : { tutorialDone: [...s.tutorialDone, id] })),

  completeIntro: () => set({ onboarding: { introSeen: true } }),
  replayIntro: () => set({ onboarding: { introSeen: false } }),

  setBrewMode: (m) => set({ brewMode: m }),

  claimOrder: (templateId) => set((s) => applyAwards(applyOrderClaim(s, templateId))),
  rerollOrder: (templateId, rng = Math.random) => set((s) => applyOrderReroll(s, templateId, rng)),
  startExpedition: (templateId) => set((s) => applyExpeditionStart(s, templateId)),
  claimExpedition: (templateId, rng = Math.random) =>
    set((s) => recordSurveyCompletions(s, applyExpeditionClaim(s, templateId, rng))),
  rushExpedition: (templateId, seconds, noCost = false) =>
    set((s) => applyExpeditionRush(s, templateId, seconds, noCost ? null : undefined)),
  rushFeastCooldown: (seconds) =>
    set((s) => ({
      feastCooldownUntilSec: Math.max(s.playedSec, s.feastCooldownUntilSec - seconds),
    })),

  // Feast (Phase 1.4): spend ale for a few game-time minutes of production bonus.
  holdFeast: () =>
    set((s) => {
      if (s.buildings.brewery < 1) return s;
      if (s.playedSec < s.feastCooldownUntilSec) return s;
      if (s.resources.ale < BALANCE.feast.aleCost) return s;
      return recordFeast({
        ...s,
        resources: { ...s.resources, ale: s.resources.ale - BALANCE.feast.aleCost },
        feastUntilSec: s.playedSec + BALANCE.feast.durationSec,
        feastCooldownUntilSec: s.playedSec + BALANCE.feast.cooldownSec,
      });
    }),

  // Rock chunk click (wall deposits): the reward is rolled here via the pure
  // helper — the UI never passes amounts in, and its layer/clicks args are
  // sanitized (unknown layer → face layer, clicks clamped in the helper).
  // Returns the per-click reward so the scene can show floating feedback.
  mineChunkClick: (layerId, totalClicks, rng = Math.random) => {
    const layer = LAYERS.find((l) => l.id === layerId) ?? layerAtDepth(get().depth);
    const reward = rollChunkClickReward(get(), layer, totalClicks, rng);
    set((s) => {
      const resources = { ...s.resources };
      for (const [k, v] of Object.entries(reward)) resources[k as ResourceId] += v as number;
      return { resources };
    });
    return reward;
  },

  // A mined-out chunk sometimes yields a collectible find (NEW_FEATURES.md §1).
  // Rolled here via the pure helper — the UI passes only the layer; it can at
  // most trigger a roll it would already get. Returns the find (or null) so the
  // scene can pop a toast + icon. Records it and flags a "New" award badge.
  claimChunkFind: (layerId, rng = Math.random) => {
    const find = rollFind(layerId, get().findsCollected, rng);
    if (!find) return null;
    set((s) =>
      appendNewAwards(
        {
          ...s,
          findsCollected: [...s.findsCollected, find.id],
          records: { ...s.records, totalFindsCollected: s.records.totalFindsCollected + 1 },
        },
        [{ type: 'find', id: find.id }],
      ),
    );
    return find;
  },

  // Market (§3): thin wrappers over the pure helpers. Selling/buying is rolled
  // in game/market.ts so the UI never touches crowns/resources directly.
  sellResource: (resource, qty) => set((s) => applySellResource(s, resource, qty)),
  buyMarketPerk: (perkId) => set((s) => applyBuyMarketPerk(s, perkId)),

  // Overseer Command (Phase 1.6, risk R1): early-game agency button. Grants a
  // few seconds of current mining output (with a floor) on a short cooldown.
  rallyMiners: (now = Date.now()) =>
    set((s) => {
      if (s.playedSec < s.rallyReadyAtSec) return s;
      const grant = Math.max(
        BALANCE.rally.baseStone,
        productionRates(s, now).mining * BALANCE.rally.secondsOfMining,
      );
      return {
        resources: { ...s.resources, stone: s.resources.stone + grant },
        rallyReadyAtSec: s.playedSec + BALANCE.rally.cooldownSec,
      };
    }),

  chooseDiscovery: (optionId, now = Date.now(), rng = Math.random) =>
    set((s) => {
      const discovery = s.pendingDiscoveryId ? DISCOVERY_MAP[s.pendingDiscoveryId] : undefined;
      const option = discovery?.options.find((o) => o.id === optionId);
      if (!discovery || !option) return s;
      return applyAwards(applyDiscoveryChoice(s, discovery, option, now, rng));
    }),

  toggleDisplayedArtifact: (id) =>
    set((s) => {
      if (!s.artifactsFound.includes(id)) return s;
      let displayedArtifacts: string[];
      if (s.displayedArtifacts.includes(id)) {
        displayedArtifacts = s.displayedArtifacts.filter((artifactId) => artifactId !== id);
      } else {
        if (s.displayedArtifacts.length >= DISPLAYED_ARTIFACT_LIMIT) return s;
        displayedArtifacts = [...s.displayedArtifacts, id];
      }
      const next = { ...s, displayedArtifacts };
      return {
        displayedArtifacts,
        resources: { ...s.resources, ale: Math.min(s.resources.ale, aleStorage(next)) },
      };
    }),

  clearNewAwards: (type) => set((s) => clearUnreadAwards(s, type)),
}));
