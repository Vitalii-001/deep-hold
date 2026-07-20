import type { GameState } from '../game/types';
import { canAfford, isStriking, workerCost } from '../game/economy';
import { WORKERS } from './workers';
import { BUILDINGS } from './buildings';

export type HintTab = 'workers' | 'buildings' | 'upgrades';

export interface TutorialStepConfig {
  id: string;
  text: string;
  target: string; // data-hint value of the element the arrow points at
  tab?: HintTab; // if the target lives in a side-panel tab, name it here
  detail?: (s: GameState) => string | null; // optional context shown under the main hint text
  requiresShown?: boolean; // doneWhen is only checked while this step is the shown one
  showWhen: (s: GameState) => boolean;
  doneWhen: (s: GameState) => boolean;
}

const MINER_COST = WORKERS.miner.baseCost.stone ?? 0; // 15
const SHAFT_COST = BUILDINGS.mineShaft.baseCost.stone ?? 0; // 50
const BREWERY_DEPTH = BUILDINGS.brewery.unlockDepth; // 25

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    // Opening beat: the very first thing a new player sees.
    id: 'visitKingsHall',
    text: 'The King summons you! Enter the Hall for your first royal decree.',
    target: 'king-hall',
    showWhen: (s) => !s.onboarding.introSeen,
    doneWhen: (s) => s.onboarding.introSeen,
  },
  {
    id: 'hireMiner',
    text: 'Hire a miner — he digs and gathers while you rest.',
    target: 'worker-miner',
    tab: 'workers',
    showWhen: (s) => s.workers.miner === 0 && s.resources.stone >= MINER_COST,
    doneWhen: (s) => s.workers.miner >= 1,
  },
  {
    id: 'buildShaft',
    text: 'Build a Mine Shaft — +3 miner slots.',
    target: 'building-mineShaft',
    tab: 'buildings',
    showWhen: (s) => s.buildings.mineShaft === 0 && s.workers.miner >= 1 && s.resources.stone >= SHAFT_COST,
    doneWhen: (s) => s.buildings.mineShaft >= 1,
  },
  {
    id: 'buildBrewery',
    text: "The ale won't last forever — build a Brewery!",
    target: 'building-brewery',
    tab: 'buildings',
    showWhen: (s) => s.buildings.brewery === 0 && s.depth >= BREWERY_DEPTH,
    doneWhen: (s) => s.buildings.brewery >= 1,
  },
  {
    id: 'hireBrewer',
    text: 'Hire a brewer — one keeps ~30 dwarves merry.',
    target: 'worker-brewer',
    tab: 'workers',
    detail: (s) => {
      const cost = workerCost(s, 'brewer');
      if (canAfford(s.resources, cost)) return null;
      const missingStone = Math.max(0, Math.ceil((cost.stone ?? 0) - s.resources.stone));
      return missingStone > 0
        ? `Need ${missingStone} more stone. Mine more stone, then hire the Brewer.`
        : 'Gather the missing resources, then hire the Brewer.';
    },
    showWhen: (s) => s.buildings.brewery >= 1 && s.workers.brewer === 0,
    doneWhen: (s) => s.workers.brewer >= 1,
  },
  {
    id: 'strikeExplain',
    text: 'No ale = STRIKE: work slows to 40%. Keep the ale flowing!',
    target: 'ale-status',
    requiresShown: true,
    showWhen: (s) => isStriking(s),
    doneWhen: (s) => !isStriking(s),
  },
];
