import type { GameState, StatId } from '../game/types';

export interface ArtifactConfig {
  id: string;
  title: string;
  description: string;
  lockedHint: string;
  icon: string;
  effectDescription: string;
  condition: (s: GameState) => boolean;
  aleStorageMult?: number;
  surveySpeedMult?: number;
  stat?: StatId;
  statMult?: number;
}

export const DISPLAYED_ARTIFACT_LIMIT = 3;

export const ARTIFACTS: ArtifactConfig[] = [
  {
    id: 'ancientTankard',
    title: 'Ancient Tankard',
    description: 'A dented tankard that somehow never spills.',
    lockedHint: 'Brew 500 total Ale.',
    icon: 'MUG',
    effectDescription: '+10% Ale storage while displayed.',
    aleStorageMult: 1.1,
    condition: (s) => s.records.totalAleBrewed >= 500,
  },
  {
    id: 'stonebeardCompass',
    title: 'Stonebeard Compass',
    description: 'Its needle points to the next useful crack.',
    lockedHint: 'Complete any scout survey.',
    icon: 'MAP',
    effectDescription: '+10% survey speed while displayed.',
    surveySpeedMult: 1.1,
    condition: (s) => s.records.surveysCompleted >= 1,
  },
  {
    id: 'firstHammerHead',
    title: 'First Hammer Head',
    description: 'The first hammer head reforged from your own ingots.',
    lockedHint: 'Smelt 10 total Ingots.',
    icon: 'HMR',
    effectDescription: '+5% Smelting while displayed.',
    stat: 'smelt',
    statMult: 1.05,
    condition: (s) => s.records.totalIngotsSmelted >= 10,
  },
];

export const ARTIFACT_MAP: Record<string, ArtifactConfig> = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a]));
