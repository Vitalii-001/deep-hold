import type { GameState } from '../game/types';
import { isStriking } from '../game/economy';
import { WORKERS } from './workers';
import { BUILDINGS } from './buildings';

export type HintTab = 'workers' | 'buildings' | 'upgrades';

export interface TutorialStepConfig {
  id: string;
  text: string;
  target: string; // data-hint value of the element the arrow points at
  tab?: HintTab; // if the target lives in a side-panel tab, name it here
  requiresShown?: boolean; // doneWhen is only checked while this step is the shown one
  showWhen: (s: GameState) => boolean;
  doneWhen: (s: GameState) => boolean;
}

const MINER_COST = WORKERS.miner.baseCost.stone ?? 0; // 15
const SHAFT_COST = BUILDINGS.mineShaft.baseCost.stone ?? 0; // 50
const BREWERY_DEPTH = BUILDINGS.brewery.unlockDepth; // 25

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: 'clickMine',
    text: 'Click MINE to dig stone!',
    target: 'mine-btn',
    showWhen: (s) => s.workers.miner === 0 && s.resources.stone < MINER_COST,
    doneWhen: (s) => s.resources.stone >= MINER_COST || s.workers.miner >= 1,
  },
  {
    id: 'hireMiner',
    text: 'Hire a miner — he digs while you rest.',
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
