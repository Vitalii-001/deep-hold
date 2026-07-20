import type { BuildingId, Cost, GameState, ResourceId, StatId, WorkerId } from './types';
import { BALANCE } from '../config/balance';
import { WORKERS } from '../config/workers';
import { BUILDINGS } from '../config/buildings';
import { UPGRADES } from '../config/upgrades';
import { MILESTONES } from '../config/milestones';
import { BREW_MODES } from '../config/brewModes';
import { MINING_METHODS, type MiningMethodConfig } from '../config/miningMethods';
import { SURVEY } from '../config/survey';
import { MODIFIERS, type ModifierConfig } from '../config/modifiers';
import { ARTIFACT_MAP, type ArtifactConfig } from '../config/artifacts';
import { layerAtDepth } from '../config/layers';
import { completedLayerSetBonuses } from './finds';

const PRODUCTION_STATS: StatId[] = ['mining', 'smelt', 'brew'];

export function scaledCost(base: Cost, growth: number, owned: number): Cost {
  const out: Cost = {};
  for (const [k, v] of Object.entries(base)) {
    out[k as ResourceId] = Math.ceil((v as number) * Math.pow(growth, owned));
  }
  return out;
}

export function canAfford(res: Record<ResourceId, number>, cost: Cost): boolean {
  return Object.entries(cost).every(([k, v]) => res[k as ResourceId] >= (v as number));
}

export function payCost(res: Record<ResourceId, number>, cost: Cost): Record<ResourceId, number> {
  const out = { ...res };
  for (const [k, v] of Object.entries(cost)) out[k as ResourceId] -= v as number;
  return out;
}

export function totalWorkers(s: GameState): number {
  return s.workers.miner + s.workers.smith + s.workers.brewer + s.workers.scout;
}

export function workerCost(s: GameState, id: WorkerId): Cost {
  const w = WORKERS[id];
  return scaledCost(w.baseCost, w.costGrowth, s.workers[id]);
}

export function buildingCost(s: GameState, id: BuildingId): Cost {
  const b = BUILDINGS[id];
  return scaledCost(b.baseCost, b.costGrowth, s.buildings[id]);
}

// Active permanent modifiers (orders/discoveries/artifacts) as configs.
export function activeModifiers(s: GameState): ModifierConfig[] {
  return (s.permanentBonuses ?? []).map((id) => MODIFIERS[id]).filter(Boolean);
}

export function displayedArtifacts(s: GameState): ArtifactConfig[] {
  const found = new Set(s.artifactsFound ?? []);
  return (s.displayedArtifacts ?? [])
    .filter((id) => found.has(id))
    .map((id) => ARTIFACT_MAP[id])
    .filter(Boolean);
}

export function workerCap(s: GameState, id: WorkerId): number {
  const cap = BALANCE.caps[id];
  let n = cap.base + cap.perLevel * s.buildings[cap.building];
  if (id === 'miner') for (const m of activeModifiers(s)) n += m.minerCapBonus ?? 0;
  return n;
}

export function aleStorage(s: GameState): number {
  let storage = BALANCE.ale.storageBase + BALANCE.ale.storagePerBreweryLevel * s.buildings.brewery;
  for (const m of activeModifiers(s)) storage += m.aleStorageBonus ?? 0;
  for (const artifact of displayedArtifacts(s)) storage *= artifact.aleStorageMult ?? 1;
  for (const set of completedLayerSetBonuses(s.findsCollected ?? [])) storage *= set.aleStorageMult ?? 1;
  return storage;
}

// One entry per active multiplier source. Every future system (brew modes,
// feasts, survey bonuses, displayed artifacts) must register here — this keeps
// the "multiplier soup" legible: UI can explain "why is mining x3.2" and the
// balance sim can log the breakdown. statMult is just the product.
export interface StatModifier {
  source: string; // e.g. 'upgrade:sharpPicks', 'building:forge', 'milestone:m75', 'blessing'
  mult: number;
}

export function getStatBreakdown(s: GameState, stat: StatId, now: number): StatModifier[] {
  const out: StatModifier[] = [];
  for (const id of s.upgrades) {
    const u = UPGRADES[id];
    if (u && u.stat === stat) out.push({ source: `upgrade:${id}`, mult: u.mult });
  }
  if (PRODUCTION_STATS.includes(stat)) {
    if (s.buildings.greatHall > 0) {
      out.push({
        source: 'building:greatHall',
        mult: Math.pow(BALANCE.production.greatHallMultPerLevel, s.buildings.greatHall),
      });
    }
    if (s.buildings.temple > 0) {
      out.push({
        source: 'building:temple',
        mult: Math.pow(BALANCE.production.templeMultPerLevel, s.buildings.temple),
      });
    }
    if (s.blessingUntil > now) out.push({ source: 'blessing', mult: BALANCE.blessing.mult });
    // permanent, stacking depth bonuses (milestones = power)
    for (const ms of MILESTONES) {
      if (s.milestonesReached.includes(ms.id)) out.push({ source: `milestone:${ms.id}`, mult: ms.mult });
    }
  }
  if (stat === 'mining' && s.buildings.forge > 0) {
    out.push({
      source: 'building:forge',
      mult: Math.pow(BALANCE.production.forgeMultPerLevel, s.buildings.forge),
    });
  }
  // brew-mode work bonuses apply only while the hold is actually supplied
  const mode = BREW_MODES[s.brewMode];
  const modeMult = mode.stats?.[stat];
  if (modeMult && !isStriking(s)) out.push({ source: `brew:${mode.id}`, mult: modeMult });
  // Wet Crack survey: brewers love the current layer's water
  if (stat === 'brew' && s.surveyBonuses[layerAtDepth(s.depth).id] === 'wetCrack') {
    out.push({ source: 'survey:wetCrack', mult: SURVEY.wetCrackBrewMult });
  }
  // feast bonus (game-time window)
  if (PRODUCTION_STATS.includes(stat) && s.playedSec < s.feastUntilSec) {
    out.push({ source: 'feast', mult: BALANCE.feast.productionMult });
  }
  // permanent modifiers (orders / discoveries / artifacts)
  for (const m of activeModifiers(s)) {
    if (m.allProduction && PRODUCTION_STATS.includes(stat)) {
      out.push({ source: `modifier:${m.id}`, mult: m.allProduction });
    }
    if (m.stat === stat && m.statMult) out.push({ source: `modifier:${m.id}`, mult: m.statMult });
  }
  for (const artifact of displayedArtifacts(s)) {
    if (artifact.stat === stat && artifact.statMult) {
      out.push({ source: `artifact:${artifact.id}`, mult: artifact.statMult });
    }
  }
  for (const set of completedLayerSetBonuses(s.findsCollected ?? [])) {
    if (set.stat === stat && set.statMult) {
      out.push({ source: `findSet:${set.layerId}`, mult: set.statMult });
    }
  }
  return out;
}

export function statMult(s: GameState, stat: StatId, now: number): number {
  return getStatBreakdown(s, stat, now).reduce((m, x) => m * x.mult, 1);
}

export function currentMethod(s: GameState): MiningMethodConfig {
  return MINING_METHODS[s.miningMethod];
}

export function surveySpeedMult(s: GameState): number {
  let mult = displayedArtifacts(s).reduce((m, artifact) => m * (artifact.surveySpeedMult ?? 1), 1);
  for (const set of completedLayerSetBonuses(s.findsCollected ?? [])) mult *= set.surveySpeedMult ?? 1;
  return mult;
}

// Descent speed: workers x upgrades x method, divided by the current layer's
// hardness — the §6.7 "wall" mechanism. Every wall has visible counters:
// dig upgrades, Stout/Glowbrew, the Bulk method, more scouts.
export function digSpeed(s: GameState, now: number): number {
  const raw =
    (BALANCE.dig.baseSpeed +
      s.workers.miner * BALANCE.dig.perMiner +
      s.workers.scout * BALANCE.dig.perScout) *
    statMult(s, 'dig', now) *
    currentMethod(s).digMult;
  return raw / layerAtDepth(s.depth).hardness;
}

// Chance of a cave-in per second (0 unless the method carries risk). Scaled by
// the layer's hazard, halved by a Stable Tunnel survey, reduced by the Temple.
export function caveInChancePerSec(s: GameState): number {
  const method = currentMethod(s);
  if (method.caveInMult <= 0) return 0;
  const layer = layerAtDepth(s.depth);
  const surveyMult = s.surveyBonuses[layer.id] === 'stableTunnel' ? SURVEY.stableTunnelCaveInMult : 1;
  return (
    BALANCE.dig.caveIn.chancePerSec *
    method.caveInMult *
    layer.hazard *
    surveyMult *
    Math.pow(1 - BALANCE.dig.caveIn.templeReductionPerLevel, s.buildings.temple)
  );
}

// Ale drunk per second — method-dependent (Bulk crews drink more).
export function aleDrinkRate(s: GameState, now: number): number {
  return (
    (totalWorkers(s) * BALANCE.ale.consumptionPerWorker * currentMethod(s).aleMult) /
    statMult(s, 'aleThrift', now)
  );
}

// True when at least one dwarf is working and there isn't enough ale to cover
// one ~0.1s tick of thirst. Pure: 'aleThrift' is not a production stat, so the
// `now` passed to statMult never changes the result.
export function isStriking(s: GameState): boolean {
  if (totalWorkers(s) === 0) return false;
  return s.resources.ale < aleDrinkRate(s, 0) * 0.1;
}

// Smooth morale (Phase 1): merry above the thirsty band, a linear slide from
// happy to strike inside it, hard strike when dry. Idle holds are "merry" so
// the multiplier never suppresses a hold with nobody in it.
export type WorkMoraleState = 'idle' | 'merry' | 'thirsty' | 'dry';

export function moraleInfo(s: GameState): { state: WorkMoraleState; mult: number } {
  if (totalWorkers(s) === 0) return { state: 'idle', mult: BALANCE.ale.happyMult };
  if (isStriking(s)) return { state: 'dry', mult: BALANCE.ale.strikeMult };
  const storage = aleStorage(s);
  const ratio = storage > 0 ? s.resources.ale / storage : 0;
  if (ratio < BALANCE.ale.thirstyRatio) {
    const t = ratio / BALANCE.ale.thirstyRatio;
    return {
      state: 'thirsty',
      mult: BALANCE.ale.strikeMult + (BALANCE.ale.happyMult - BALANCE.ale.strikeMult) * t,
    };
  }
  return { state: 'merry', mult: BALANCE.ale.happyMult };
}

// Brewers are immune to bad morale ("brewers drink first") so recovering from
// a strike is always fast — they keep at least their normal pace, and still
// enjoy the merry bonus when everyone else does.
export function brewerMoraleMult(s: GameState): number {
  return Math.max(moraleInfo(s).mult, 1);
}

export interface ProductionRates {
  workers: number;
  aleDrink: number;
  moraleMult: number;
  stunMult: number;
  workMult: number;
  mining: number;
  secondary: Partial<Record<ResourceId, number>>;
  smelt: number;
  brew: number;
  dig: number;
}

// Smelter throughput ceiling (conversions/s) — the Phase 2 processing bottleneck.
export function smeltCapacity(s: GameState): number {
  return s.buildings.smelter * BALANCE.smelt.capacityPerSmelterLevel;
}

export function productionRates(s: GameState, now = Date.now()): ProductionRates {
  const workers = totalWorkers(s);
  const aleDrink = aleDrinkRate(s, now);
  const moraleMult = moraleInfo(s).mult;
  const stunMult = s.caveInUntil > now ? BALANCE.dig.caveIn.stunMult : 1;
  const workMult = moraleMult * stunMult;
  const method = currentMethod(s);
  const layer = layerAtDepth(s.depth);
  const baseMined = s.workers.miner * WORKERS.miner.baseRate * statMult(s, 'mining', now) * workMult;
  const mining = baseMined * method.stoneMult;
  const secondary: Partial<Record<ResourceId, number>> = {};

  const richVein = s.surveyBonuses[layer.id] === 'richVein' ? SURVEY.richVeinYieldMult : 1;
  for (const [rid, ratio] of Object.entries(layer.baseYield)) {
    secondary[rid as ResourceId] = baseMined * (ratio as number) * method.secondaryMult * richVein;
  }

  return {
    workers,
    aleDrink,
    moraleMult,
    stunMult,
    workMult,
    mining,
    secondary,
    smelt: Math.min(
      s.workers.smith * WORKERS.smith.baseRate * statMult(s, 'smelt', now) * workMult,
      smeltCapacity(s),
      s.resources.ore / BALANCE.smelt.orePerIngot,
    ),
    // brewers: morale-immune + brew-mode rate (kept in sync with systems/ale.ts)
    brew:
      s.workers.brewer *
      WORKERS.brewer.baseRate *
      BREW_MODES[s.brewMode].brewRateMult *
      statMult(s, 'brew', now) *
      brewerMoraleMult(s) *
      stunMult,
    dig: digSpeed(s, now) * workMult,
  };
}
