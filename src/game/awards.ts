import { ARTIFACTS, DISPLAYED_ARTIFACT_LIMIT } from '../config/artifacts';
import { TROPHIES } from '../config/trophies';
import type { AwardType, GameRecords, GameState, NewAward, ResourceId } from './types';
import { isStriking, totalWorkers } from './economy';
import { mergeRecords } from './records';
import type { TickContext } from './systems/context';

const NEW_AWARD_CAP = 20;

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function surveyCount(s: GameState): number {
  return Object.values(s.surveyBonuses).filter(Boolean).length;
}

export function appendNewAwards(s: GameState, awards: NewAward[]): GameState {
  if (awards.length === 0) return s;
  const existing = s.newAwards ?? [];
  const seen = new Set(existing.map((a) => `${a.type}:${a.id}`));
  const added: NewAward[] = [];
  for (const award of awards) {
    const key = `${award.type}:${award.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    added.push(award);
  }
  if (added.length === 0) return s;
  return { ...s, newAwards: [...existing, ...added].slice(-NEW_AWARD_CAP) };
}

export function clearNewAwards(s: GameState, type?: AwardType): GameState {
  const newAwards = type === undefined ? [] : (s.newAwards ?? []).filter((a) => a.type !== type);
  return newAwards.length === (s.newAwards ?? []).length ? s : { ...s, newAwards };
}

export function applyAwards(s: GameState): GameState {
  let out = {
    ...s,
    records: mergeRecords(s.records),
    trophiesEarned: uniqueIds(s.trophiesEarned ?? []),
    artifactsFound: uniqueIds(s.artifactsFound ?? []),
    displayedArtifacts: uniqueIds(s.displayedArtifacts ?? []).filter((id) => (s.artifactsFound ?? []).includes(id)).slice(0, DISPLAYED_ARTIFACT_LIMIT),
    newAwards: [...(s.newAwards ?? [])].slice(-NEW_AWARD_CAP),
  };

  const newAwards: NewAward[] = [];
  for (const trophy of TROPHIES) {
    if (!out.trophiesEarned.includes(trophy.id) && trophy.condition(out)) {
      out = { ...out, trophiesEarned: [...out.trophiesEarned, trophy.id] };
      newAwards.push({ type: 'trophy', id: trophy.id });
    }
  }

  for (const artifact of ARTIFACTS) {
    if (!out.artifactsFound.includes(artifact.id) && artifact.condition(out)) {
      out = { ...out, artifactsFound: [...out.artifactsFound, artifact.id] };
      newAwards.push({ type: 'artifact', id: artifact.id });
    }
  }

  return appendNewAwards(out, newAwards);
}

function recordsFromTick(ctx: TickContext, s: GameState): GameRecords {
  const records = mergeRecords(s.records);
  const workers = totalWorkers(ctx.prev);
  const activeShift = workers > 0;
  const currentMerryShiftSec = activeShift && ctx.merry ? records.currentMerryShiftSec + ctx.dt : 0;
  const surveysCompleted = records.surveysCompleted + Math.max(0, surveyCount(s) - surveyCount(ctx.prev));

  return {
    ...records,
    totalAleBrewed: records.totalAleBrewed + Math.max(0, ctx.aleBrewed),
    totalAleConsumed: records.totalAleConsumed + Math.max(0, ctx.aleConsumed),
    longestMerryShiftSec: Math.max(records.longestMerryShiftSec, currentMerryShiftSec),
    currentMerryShiftSec,
    totalOreMined: records.totalOreMined + Math.max(0, ctx.oreMined),
    totalGoldMined: records.totalGoldMined + Math.max(0, ctx.goldMined),
    totalIngotsSmelted: records.totalIngotsSmelted + Math.max(0, ctx.ingotsSmelted),
    caveInsSurvived: records.caveInsSurvived + (ctx.caveInTriggered ? 1 : 0),
    strikesRecovered: records.strikesRecovered + (isStriking(ctx.prev) && !isStriking(s) ? 1 : 0),
    selectiveSec: records.selectiveSec + (activeShift && ctx.prev.miningMethod === 'selective' ? ctx.dt : 0),
    bulkSec: records.bulkSec + (activeShift && ctx.prev.miningMethod === 'bulk' ? ctx.dt : 0),
    surveysCompleted,
  };
}

export function applyAwardSystem(ctx: TickContext, s: GameState): GameState {
  return applyAwards({ ...s, records: recordsFromTick(ctx, s) });
}

export function recordFeast(s: GameState): GameState {
  const records = mergeRecords(s.records);
  return applyAwards({ ...s, records: { ...records, feastsHeld: records.feastsHeld + 1 } });
}

export function recordSurveyCompletions(prev: GameState, next: GameState): GameState {
  const completed = Math.max(0, surveyCount(next) - surveyCount(prev));
  if (completed === 0) return applyAwards(next);
  const records = mergeRecords(next.records);
  return applyAwards({ ...next, records: { ...records, surveysCompleted: records.surveysCompleted + completed } });
}

export function recordOfflineBest(s: GameState, gained: Record<ResourceId, number>): GameState {
  const records = mergeRecords(s.records);
  const bestOfflineYield = { ...records.bestOfflineYield };
  let improved = false;

  for (const id of Object.keys(gained) as ResourceId[]) {
    const value = Math.max(0, gained[id]);
    if (value > (bestOfflineYield[id] ?? 0)) {
      bestOfflineYield[id] = value;
      improved = true;
    }
  }

  const out = applyAwards({ ...s, records: { ...records, bestOfflineYield } });
  return improved ? appendNewAwards(out, [{ type: 'record', id: 'bestOfflineYield' }]) : out;
}
