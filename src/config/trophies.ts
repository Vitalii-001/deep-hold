import type { GameState } from '../game/types';

export type TrophyCategory = 'ale' | 'mining';

export interface TrophyConfig {
  id: string;
  title: string;
  description: string;
  lockedHint: string;
  icon: string;
  category: TrophyCategory;
  condition: (s: GameState) => boolean;
}

export const TROPHIES: TrophyConfig[] = [
  {
    id: 'firstCask',
    title: 'First Cask',
    description: 'The first proper cask is logged in the cellar.',
    lockedHint: 'Brew at least 1 Ale.',
    icon: 'ALE',
    category: 'ale',
    condition: (s) => s.records.totalAleBrewed >= 1,
  },
  {
    id: 'noDryShift',
    title: 'No Dry Shift',
    description: 'Keep the hold merry for ten straight minutes.',
    lockedHint: 'Keep working dwarves merry for 10 minutes.',
    icon: '10m',
    category: 'ale',
    condition: (s) => s.records.longestMerryShiftSec >= 600,
  },
  {
    id: 'masterBrewer',
    title: 'Master Brewer',
    description: 'Brew 500 Ale over the life of the hold.',
    lockedHint: 'Brew 500 total Ale.',
    icon: '500',
    category: 'ale',
    condition: (s) => s.records.totalAleBrewed >= 500,
  },
  {
    id: 'royalFeast',
    title: 'Royal Feast',
    description: 'Hold a feast worthy of the hall.',
    lockedHint: 'Spend Ale on a Royal Feast.',
    icon: 'FST',
    category: 'ale',
    condition: (s) => s.records.feastsHeld >= 1,
  },
  {
    id: 'nightCellar',
    title: 'Night Cellar',
    description: 'Return to a cellar that grew while you were away.',
    lockedHint: 'Gain at least 50 Ale from one offline report.',
    icon: 'NIT',
    category: 'ale',
    condition: (s) => (s.records.bestOfflineYield.ale ?? 0) >= 50,
  },
  {
    id: 'strikebreaker',
    title: 'Strikebreaker',
    description: 'Bring a dry hold back to work.',
    lockedHint: 'Recover from an ale strike.',
    icon: 'BRK',
    category: 'ale',
    condition: (s) => s.records.strikesRecovered >= 1,
  },
  {
    id: 'ironVeinsSurveyed',
    title: 'Iron Veins Surveyed',
    description: 'Complete a scout survey of the iron route.',
    lockedHint: 'Complete any scout survey.',
    icon: 'MAP',
    category: 'mining',
    condition: (s) => s.records.surveysCompleted >= 1,
  },
  {
    id: 'selectiveMaster',
    title: 'Selective Master',
    description: 'Run a focused selective operation.',
    lockedHint: 'Mine selectively for 2 total minutes.',
    icon: 'SEL',
    category: 'mining',
    condition: (s) => s.records.selectiveSec >= 120,
  },
  {
    id: 'bulkBaron',
    title: 'Bulk Baron',
    description: 'Move stone in royal bulk.',
    lockedHint: 'Mine in Bulk mode for 2 total minutes.',
    icon: 'BLK',
    category: 'mining',
    condition: (s) => s.records.bulkSec >= 120,
  },
  {
    id: 'goldSeamCharter',
    title: 'Gold Seam Charter',
    description: 'The crown recognizes your gold seam claim.',
    lockedHint: 'Complete the Gold Seams charter chapter.',
    icon: 'GLD',
    category: 'mining',
    condition: (s) => s.charterGoalsDone.includes('c4-reach200'),
  },
  {
    id: 'deepLedger',
    title: 'Deep Ledger',
    description: 'The ledger reaches the ancient gate.',
    lockedHint: 'Reach 1000 m.',
    icon: 'DIP',
    category: 'mining',
    condition: (s) => s.depth >= 1000 || s.discoveriesSeen.includes('sealedGate'),
  },
  {
    id: 'cleanHaulage',
    title: 'Clean Haulage',
    description: 'Reach the flooded caverns without a cave-in.',
    lockedHint: 'Reach 300 m before any cave-in.',
    icon: 'CLN',
    category: 'mining',
    condition: (s) => s.depth >= 300 && s.records.caveInsSurvived === 0,
  },
];

export const TROPHY_MAP: Record<string, TrophyConfig> = Object.fromEntries(TROPHIES.map((t) => [t.id, t]));
