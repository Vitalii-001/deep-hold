import type { Cost, GameState } from '../game/types';

// The Royal Charter: sequential campaign goals grouped into chapters.
// Goals complete strictly in order; rewards are granted automatically on
// completion (see game/charter.ts). All numbers live here — tune freely.

export interface CharterGoal {
  id: string;
  text: string;
  // Progress toward the goal; the goal is complete when current >= target.
  progress: (s: GameState) => { current: number; target: number };
  reward?: Cost; // resource grant on completion
}

export interface CharterChapter {
  id: string;
  title: string;
  goals: CharterGoal[];
  reward?: Cost; // extra grant when the whole chapter is done
}

export const CHARTER: CharterChapter[] = [
  {
    id: 'ch1',
    title: 'Chapter I: Claim the Mountain',
    reward: { stone: 50 },
    goals: [
      {
        id: 'c1-gatherStone',
        text: 'Gather 40 Stone',
        progress: (s) => ({ current: s.resources.stone, target: 40 }),
      },
      {
        id: 'c1-hireMiner',
        text: 'Hire 1 Miner',
        progress: (s) => ({ current: s.workers.miner, target: 1 }),
      },
      {
        id: 'c1-buildMineShaft',
        text: 'Build 1 Mine Shaft',
        progress: (s) => ({ current: s.buildings.mineShaft, target: 1 }),
        reward: { ale: 10 },
      },
      {
        id: 'c1-reach25',
        text: 'Reach 25 m',
        progress: (s) => ({ current: s.depth, target: 25 }),
      },
    ],
  },
  {
    id: 'ch2',
    title: 'Chapter II: Keep the Hold Merry',
    reward: { ale: 40 },
    goals: [
      {
        id: 'c2-buildBrewery',
        text: 'Build 1 Brewery',
        progress: (s) => ({ current: s.buildings.brewery, target: 1 }),
      },
      {
        id: 'c2-hireBrewer',
        text: 'Hire 1 Brewer',
        progress: (s) => ({ current: s.workers.brewer, target: 1 }),
        reward: { stone: 40 },
      },
      {
        id: 'c2-keepAle',
        text: 'Keep Ale above 10',
        progress: (s) => ({ current: s.resources.ale, target: 10 }),
      },
      {
        id: 'c2-reach75',
        text: 'Reach 75 m',
        progress: (s) => ({ current: s.depth, target: 75 }),
      },
    ],
  },
  {
    id: 'ch3',
    title: 'Chapter III: Ironworks',
    reward: { ingot: 10 },
    goals: [
      {
        id: 'c3-reach75',
        text: 'Reach 75 m',
        progress: (s) => ({ current: s.depth, target: 75 }),
      },
      {
        id: 'c3-buildSmelter',
        text: 'Build 1 Smelter',
        progress: (s) => ({ current: s.buildings.smelter, target: 1 }),
      },
      {
        id: 'c3-hireSmith',
        text: 'Hire 1 Smith',
        progress: (s) => ({ current: s.workers.smith, target: 1 }),
        reward: { ore: 20 },
      },
      {
        id: 'c3-ingots10',
        text: 'Produce or own 10 Ingots',
        progress: (s) => ({ current: s.resources.ingot, target: 10 }),
      },
      {
        id: 'c3-reach120',
        text: 'Reach 120 m',
        progress: (s) => ({ current: s.depth, target: 120 }),
      },
    ],
  },
  {
    id: 'ch4',
    title: 'Chapter IV: Gold Seams',
    reward: { gold: 60 },
    goals: [
      {
        id: 'c4-buildForge',
        text: 'Build 1 Forge',
        progress: (s) => ({ current: s.buildings.forge, target: 1 }),
      },
      {
        id: 'c4-buildGreatHall',
        text: 'Build 1 Great Hall',
        progress: (s) => ({ current: s.buildings.greatHall, target: 1 }),
        reward: { ingot: 20 },
      },
      {
        id: 'c4-hireScout',
        text: 'Hire 1 Scout',
        progress: (s) => ({ current: s.workers.scout, target: 1 }),
      },
      {
        id: 'c4-gold50',
        text: 'Own 50 Gold',
        progress: (s) => ({ current: s.resources.gold, target: 50 }),
      },
      {
        id: 'c4-reach200',
        text: 'Reach 200 m',
        progress: (s) => ({ current: s.depth, target: 200 }),
      },
    ],
  },
  {
    id: 'ch5',
    title: 'Chapter V: Gem Hollows',
    reward: { gem: 20 },
    goals: [
      {
        id: 'c5-buildTemple',
        text: 'Build the Temple of the Ancestors',
        progress: (s) => ({ current: s.buildings.temple, target: 1 }),
      },
      {
        id: 'c5-greatHall3',
        text: 'Great Hall to level 3',
        progress: (s) => ({ current: s.buildings.greatHall, target: 3 }),
        reward: { gold: 150 },
      },
      {
        id: 'c5-gems20',
        text: 'Own 20 Gems',
        progress: (s) => ({ current: s.resources.gem, target: 20 }),
      },
      {
        id: 'c5-reach450',
        text: 'Reach 450 m',
        progress: (s) => ({ current: s.depth, target: 450 }),
      },
    ],
  },
  {
    id: 'ch6',
    title: 'Chapter VI: Hall of the Ancestors',
    reward: { gold: 400 },
    goals: [
      {
        id: 'c6-temple3',
        text: 'Temple to level 3',
        progress: (s) => ({ current: s.buildings.temple, target: 3 }),
      },
      {
        id: 'c6-gold300',
        text: 'Own 300 Gold',
        progress: (s) => ({ current: s.resources.gold, target: 300 }),
      },
      {
        id: 'c6-gems40',
        text: 'Own 40 Gems',
        progress: (s) => ({ current: s.resources.gem, target: 40 }),
        reward: { gem: 20 },
      },
      {
        id: 'c6-reach700',
        text: 'Reach 700 m',
        progress: (s) => ({ current: s.depth, target: 700 }),
      },
    ],
  },
  {
    id: 'ch7',
    title: 'Chapter VII: The Ancient Gate',
    reward: { gem: 80 },
    goals: [
      {
        id: 'c7-forge5',
        text: 'Forge to level 5',
        progress: (s) => ({ current: s.buildings.forge, target: 5 }),
      },
      {
        id: 'c7-temple5',
        text: 'Temple to level 5',
        progress: (s) => ({ current: s.buildings.temple, target: 5 }),
      },
      {
        id: 'c7-gems100',
        text: 'Own 100 Gems',
        progress: (s) => ({ current: s.resources.gem, target: 100 }),
      },
      {
        id: 'c7-reach1000',
        text: 'Reach 1000 m — the Deep Hold is yours',
        progress: (s) => ({ current: s.depth, target: 1000 }),
      },
    ],
  },
];

export const CHARTER_GOAL_COUNT = CHARTER.reduce((n, ch) => n + ch.goals.length, 0);

export function findCharterGoal(
  id: string,
): { chapter: CharterChapter; goal: CharterGoal } | null {
  for (const chapter of CHARTER) {
    const goal = chapter.goals.find((g) => g.id === id);
    if (goal) return { chapter, goal };
  }
  return null;
}
