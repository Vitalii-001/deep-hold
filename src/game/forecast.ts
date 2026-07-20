import type { GameState, ResourceId } from './types';
import { BALANCE } from '../config/balance';
import { WORKERS } from '../config/workers';
import { BREW_MODES } from '../config/brewModes';
import { layerAtDepth, nextLayer, type LayerConfig } from '../config/layers';
import type { MiningMethodConfig } from '../config/miningMethods';
import {
  aleDrinkRate,
  aleStorage,
  brewerMoraleMult,
  currentMethod,
  moraleInfo,
  productionRates,
  smeltCapacity,
  statMult,
  totalWorkers,
  workerCap,
  type WorkMoraleState,
} from './economy';
import { getCharterProgress } from './charter';
import { orderStatus } from './orders';
import { EXPEDITION_MAP } from '../config/expeditions';
import { formatDuration, formatNumber } from './format';

// Forecast/selector layer (NEW_GAME_ARCHITECTURE.md §2.2): pure functions the
// UI shares with the simulation, so panels never re-derive tick math.
// Phase 2 adds getMiningForecast / getBottlenecks / getNextBestActions here.

export interface AleForecast {
  workers: number;
  drinkRate: number; // ale/s consumed
  brewRate: number; // ale/s produced (brew mode + brewer morale immunity included)
  netAle: number; // brewRate - drinkRate
  storage: number;
  timeToDry: number | null; // sec until ale hits 0 at current net (null if not draining)
  timeToFull: number | null; // sec until storage is full (null if not filling)
  moraleState: WorkMoraleState; // idle | merry | thirsty | dry
  moraleMult: number;
  recommendedBrewers: number; // extra brewers needed to turn netAle non-negative
}

export function getAleForecast(s: GameState, now: number = Date.now()): AleForecast {
  const workers = totalWorkers(s);
  const morale = moraleInfo(s);
  const moraleState = workers === 0 ? 'idle' : morale.state;

  const thrift = statMult(s, 'aleThrift', now);
  const drinkRate = aleDrinkRate(s, now); // method-aware (Bulk crews drink more)
  const stun = s.caveInUntil > now ? BALANCE.dig.caveIn.stunMult : 1;
  const brewPerBrewer =
    WORKERS.brewer.baseRate *
    BREW_MODES[s.brewMode].brewRateMult *
    statMult(s, 'brew', now) *
    brewerMoraleMult(s) *
    stun;
  const brewRate = s.workers.brewer * brewPerBrewer;
  const netAle = brewRate - drinkRate;

  const storage = aleStorage(s);
  const ale = s.resources.ale;
  const timeToDry = netAle < -1e-9 && ale > 0 ? ale / -netAle : null;
  const timeToFull = netAle > 1e-9 && ale < storage ? (storage - ale) / netAle : null;

  // Each extra brewer adds brewPerBrewer but also drinks — solve
  // (drink + n*perWorkerDrink) <= (brew + n*brewPerBrewer) for the smallest n.
  const perWorkerDrink = workers > 0 ? drinkRate / workers : BALANCE.ale.consumptionPerWorker / thrift;
  let recommendedBrewers = 0;
  if (netAle < -1e-9) {
    const gainPerBrewer = brewPerBrewer - perWorkerDrink;
    recommendedBrewers = gainPerBrewer > 1e-9 ? Math.ceil(-netAle / gainPerBrewer) : Infinity;
  }

  return {
    workers,
    drinkRate,
    brewRate,
    netAle,
    storage,
    timeToDry,
    timeToFull,
    moraleState,
    moraleMult: morale.mult,
    recommendedBrewers,
  };
}

// Mining snapshot for the mine scene (MINE_SCREEN.md Pass 1): the activity
// layer reads THIS, never economy math directly.
export type HardnessLabel = 'Soft' | 'Firm' | 'Tough' | 'Brutal';

export interface MiningForecast {
  layer: LayerConfig;
  nextLayer: LayerConfig | null;
  method: MiningMethodConfig;
  hardness: number;
  hardnessLabel: HardnessLabel;
  digSpeed: number; // m/s, morale included
  stoneRate: number; // stone/s
  secondaryRates: Partial<Record<ResourceId, number>>;
  surveyBonusId: string | undefined; // bonus rolled for the CURRENT layer, if any
  moraleState: WorkMoraleState;
}

function hardnessLabel(h: number): HardnessLabel {
  if (h < 2) return 'Soft';
  if (h < 5) return 'Firm';
  if (h < 12) return 'Tough';
  return 'Brutal';
}

export function getMiningForecast(s: GameState, now: number = Date.now()): MiningForecast {
  const layer = layerAtDepth(s.depth);
  const rates = productionRates(s, now);
  return {
    layer,
    nextLayer: nextLayer(s.depth),
    method: currentMethod(s),
    hardness: layer.hardness,
    hardnessLabel: hardnessLabel(layer.hardness),
    digSpeed: rates.dig,
    stoneRate: rates.mining,
    secondaryRates: rates.secondary,
    surveyBonusId: s.surveyBonuses[layer.id],
    moraleState: getAleForecast(s, now).moraleState,
  };
}

// The single most pressing constraint on progress right now (Phase 2.5).
// Order = priority: thirst starves everything, then hauling, then processing.
export interface Bottleneck {
  id: 'aleSupport' | 'processing' | 'haulage' | 'miningPower';
  label: string;
  hint: string;
}

export function getBottlenecks(s: GameState, now: number = Date.now()): Bottleneck[] {
  const out: Bottleneck[] = [];
  const ale = getAleForecast(s, now);
  if (ale.netAle < 0 && ale.workers > 0) {
    out.push({
      id: 'aleSupport',
      label: 'Ale Support',
      hint:
        Number.isFinite(ale.recommendedBrewers) && ale.recommendedBrewers > 0
          ? `Hire ${ale.recommendedBrewers} Brewer${ale.recommendedBrewers > 1 ? 's' : ''} or build a Brewery`
          : 'Build a Brewery',
    });
  }
  const rates = productionRates(s, now);
  const oreIn = rates.secondary.ore ?? 0;
  if (s.buildings.smelter >= 1 && oreIn > rates.smelt + 1e-9 && s.resources.ore > 10) {
    out.push({
      id: 'processing',
      label: 'Processing',
      hint:
        rates.smelt >= smeltCapacity(s) - 1e-9
          ? 'Ore backlog: build another Smelter level'
          : 'Ore backlog: hire a Smith',
    });
  }
  if (s.workers.miner >= workerCap(s, 'miner')) {
    out.push({ id: 'haulage', label: 'Haulage', hint: 'Miners at capacity: build a Mine Shaft' });
  } else if (out.length === 0) {
    out.push({ id: 'miningPower', label: 'Mining Power', hint: 'Hire more Miners' });
  }
  return out;
}

export interface NextBestAction {
  id: string;
  title: string;
  detail: string;
}

export function getNextBestActions(s: GameState, now: number = Date.now()): NextBestAction[] {
  const actions: NextBestAction[] = [];

  const readyExpedition = s.expeditions.find((e) => e.remainingSec <= 0);
  if (readyExpedition) {
    actions.push({
      id: `expedition:${readyExpedition.templateId}`,
      title: `Claim ${EXPEDITION_MAP[readyExpedition.templateId]?.title ?? 'Expedition'}`,
      detail: 'A return timer is ready in the Orders panel.',
    });
  } else {
    const nextExpedition = s.expeditions.find((e) => e.remainingSec > 0);
    if (nextExpedition) {
      actions.push({
        id: `expedition:${nextExpedition.templateId}`,
        title: EXPEDITION_MAP[nextExpedition.templateId]?.title ?? 'Expedition',
        detail: `Returns in ${formatDuration(nextExpedition.remainingSec)}.`,
      });
    }
  }

  const claimableOrder = s.activeOrders.map((order) => orderStatus(s, order)).find((status) => status?.claimable);
  if (claimableOrder) {
    actions.push({
      id: `order:${claimableOrder.config.id}`,
      title: `Claim Royal Order`,
      detail: claimableOrder.config.title,
    });
  }

  const bottleneck = getBottlenecks(s, now)[0];
  if (bottleneck) {
    actions.push({
      id: `bottleneck:${bottleneck.id}`,
      title: `Fix ${bottleneck.label}`,
      detail: bottleneck.hint,
    });
  }

  const charter = getCharterProgress(s);
  if (charter.current) {
    actions.push({
      id: `charter:${charter.current.goal.id}`,
      title: 'Advance the Charter',
      detail: `${charter.current.goal.text}: ${formatNumber(Math.min(charter.current.current, charter.current.target))}/${formatNumber(charter.current.target)}`,
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'idle:deeper',
      title: 'Dig Deeper',
      detail: 'Keep the hold supplied and push toward the next layer.',
    });
  }

  return actions.slice(0, 4);
}
