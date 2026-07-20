import type { GameRecords } from './types';

export function initialRecords(): GameRecords {
  return {
    totalAleBrewed: 0,
    totalAleConsumed: 0,
    longestMerryShiftSec: 0,
    currentMerryShiftSec: 0,
    totalOreMined: 0,
    totalGoldMined: 0,
    totalIngotsSmelted: 0,
    caveInsSurvived: 0,
    bestOfflineYield: {},
    feastsHeld: 0,
    strikesRecovered: 0,
    selectiveSec: 0,
    bulkSec: 0,
    surveysCompleted: 0,
    totalFindsCollected: 0,
  };
}

export function mergeRecords(raw: Partial<GameRecords> | undefined): GameRecords {
  return {
    ...initialRecords(),
    ...(raw ?? {}),
    bestOfflineYield: {
      ...initialRecords().bestOfflineYield,
      ...(raw?.bestOfflineYield ?? {}),
    },
  };
}
