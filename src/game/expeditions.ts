import { EXPEDITION_MAP } from '../config/expeditions';
import { SURVEY, SURVEY_BONUSES } from '../config/survey';
import { nextLayer } from '../config/layers';
import type { Cost, Expedition, GameState } from './types';
import { aleStorage, canAfford, payCost } from './economy';

export interface ExpeditionStatus {
  expedition: Expedition;
  ready: boolean;
}

function activeExpedition(s: GameState, templateId: string): Expedition | undefined {
  return s.expeditions.find((e) => e.templateId === templateId);
}

export function expeditionStatuses(s: GameState): ExpeditionStatus[] {
  return s.expeditions.map((expedition) => ({ expedition, ready: expedition.remainingSec <= 0 }));
}

export function startExpedition(s: GameState, templateId: string): GameState {
  const cfg = EXPEDITION_MAP[templateId];
  if (!cfg || activeExpedition(s, templateId)) return s;
  if (!cfg.unlock(s) || (cfg.canStart && !cfg.canStart(s))) return s;
  if (cfg.cost && !canAfford(s.resources, cfg.cost)) return s;

  const resources = cfg.cost ? payCost(s.resources, cfg.cost) : s.resources;
  const targetLayerId = templateId === 'scoutReport' ? (nextLayer(s.depth)?.id ?? undefined) : undefined;
  return {
    ...s,
    resources,
    expeditions: [...s.expeditions, { templateId, remainingSec: cfg.durationSec, targetLayerId }],
  };
}

export function tickExpeditions(s: GameState, dt: number): GameState {
  if (s.expeditions.length === 0 || dt <= 0) return s;
  let changed = false;
  const expeditions = s.expeditions.map((e) => {
    if (e.remainingSec <= 0) return e;
    const remainingSec = Math.max(0, e.remainingSec - dt);
    if (remainingSec !== e.remainingSec) changed = true;
    return { ...e, remainingSec };
  });
  return changed ? { ...s, expeditions } : s;
}

export function rushExpedition(
  s: GameState,
  templateId: string,
  seconds: number,
  cost: Cost | null | undefined = EXPEDITION_MAP[templateId]?.freeRushCost,
): GameState {
  const exp = activeExpedition(s, templateId);
  if (!exp || exp.remainingSec <= 0 || seconds <= 0) return s;
  if (cost && !canAfford(s.resources, cost)) return s;
  const resources = cost ? payCost(s.resources, cost) : s.resources;
  return {
    ...s,
    resources,
    expeditions: s.expeditions.map((e) =>
      e.templateId === templateId ? { ...e, remainingSec: Math.max(0, e.remainingSec - seconds) } : e,
    ),
  };
}

function rollSurveyBonus(rng: () => number) {
  return SURVEY_BONUSES[Math.floor(rng() * SURVEY_BONUSES.length) % SURVEY_BONUSES.length];
}

export function claimExpedition(s: GameState, templateId: string, rng: () => number = Math.random): GameState {
  const exp = activeExpedition(s, templateId);
  if (!exp || exp.remainingSec > 0) return s;

  let resources = { ...s.resources };
  let surveyProgress = s.surveyProgress;
  let surveyBonuses = s.surveyBonuses;

  if (templateId === 'stoutBatch') {
    resources.ale = Math.min(aleStorage(s), resources.ale + 80);
  }

  if (templateId === 'scoutReport') {
    const targetLayerId = exp.targetLayerId ?? nextLayer(s.depth)?.id;
    if (targetLayerId && surveyBonuses[targetLayerId] === undefined) {
      const bonus = rollSurveyBonus(rng);
      surveyProgress = { ...surveyProgress, [targetLayerId]: 100 };
      surveyBonuses = { ...surveyBonuses, [targetLayerId]: bonus.id };
      if (bonus.id === 'ancientCache') resources.gold += SURVEY.ancientCacheGold;
    } else {
      resources.gold += 10; // useful fallback when the layer was surveyed before claim
    }
  }

  return {
    ...s,
    resources,
    surveyProgress,
    surveyBonuses,
    expeditions: s.expeditions.filter((e) => e.templateId !== templateId),
  };
}
