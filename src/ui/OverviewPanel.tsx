import { BUILDINGS } from '../config/buildings';
import { MILESTONES } from '../config/milestones';
import { UPGRADE_LIST } from '../config/upgrades';
import { DISCOVERIES } from '../config/discoveries';
import { layerAtDepth } from '../config/layers';
import { useGame, type GameStore } from '../game/store';
import type { Cost } from '../game/types';
import { buildingCost, canAfford, totalWorkers, workerCap, workerCost } from '../game/economy';
import { getCharterProgress } from '../game/charter';
import { getBottlenecks } from '../game/forecast';
import { formatNumber } from '../game/format';
import { useUi, type ActivePanel } from './uiStore';
import { CostLabel } from './CostLabel';
import { sfx } from './sfx';

interface Goal {
  title: string;
  detail: string;
  progress: number;
  progressLabel: string;
  cost?: Cost;
  actionLabel: string;
  action: () => void;
}

function costProgress(resources: GameStore['resources'], cost: Cost): number {
  const entries = Object.entries(cost);
  if (entries.length === 0) return 1;
  return Math.min(...entries.map(([id, amount]) => resources[id as keyof typeof resources] / (amount as number)));
}

function buildPanelGoal(
  setActivePanel: (panel: ActivePanel) => void,
  panel: ActivePanel,
  title: string,
  detail: string,
  progress: number,
  progressLabel: string,
  actionLabel: string,
  cost?: Cost,
): Goal {
  return {
    title,
    detail,
    progress,
    progressLabel,
    cost,
    actionLabel,
    action: () => setActivePanel(panel),
  };
}

function chooseGoal(s: GameStore, setActivePanel: (panel: ActivePanel) => void): Goal {
  const minerCost = workerCost(s, 'miner');
  const mineShaftCost = buildingCost(s, 'mineShaft');
  const breweryCost = buildingCost(s, 'brewery');
  const brewerCost = workerCost(s, 'brewer');
  const smelterCost = buildingCost(s, 'smelter');
  const smithCost = workerCost(s, 'smith');

  if (s.workers.miner === 0) {
    const affordable = canAfford(s.resources, minerCost);
    return buildPanelGoal(
      setActivePanel,
      'workers',
      'Hire your first Miner',
      'A miner gathers stone and drives the descent — the hold runs on dwarves, not clicks.',
      affordable ? 1 : costProgress(s.resources, minerCost),
      affordable ? 'Ready to hire' : 'Gather the required stone',
      'Open Workers',
      minerCost,
    );
  }

  if (s.buildings.mineShaft === 0) {
    if (canAfford(s.resources, mineShaftCost)) {
      return {
        title: 'Build the first Mine Shaft',
        detail: 'More shaft space raises the miner cap and supports the early economy.',
        progress: 1,
        progressLabel: 'Ready to build',
        cost: mineShaftCost,
        actionLabel: 'Build Mine Shaft',
        action: () => {
          s.buildBuilding('mineShaft');
          sfx.coin();
        },
      };
    }
    return buildPanelGoal(
      setActivePanel,
      'workers',
      'Stockpile stone for a Mine Shaft',
      'Let your miners pile up stone — hire more to speed it up.',
      costProgress(s.resources, mineShaftCost),
      'Gather the required stone',
      'Open Workers',
      mineShaftCost,
    );
  }

  if (s.depth < BUILDINGS.brewery.unlockDepth) {
    return buildPanelGoal(
      setActivePanel,
      'workers',
      'Reach the Brewery depth',
      'The ale economy opens at the next layer checkpoint.',
      s.depth / BUILDINGS.brewery.unlockDepth,
      `${formatNumber(s.depth)} / ${BUILDINGS.brewery.unlockDepth} m`,
      'Review Workers',
    );
  }

  if (s.buildings.brewery === 0) {
    if (canAfford(s.resources, breweryCost)) {
      return {
        title: 'Build a Brewery',
        detail: 'Ale turns from a starting buffer into a managed production loop.',
        progress: 1,
        progressLabel: 'Ready to build',
        cost: breweryCost,
        actionLabel: 'Build Brewery',
        action: () => {
          s.buildBuilding('brewery');
          sfx.coin();
        },
      };
    }
    return buildPanelGoal(
      setActivePanel,
      'buildings',
      'Fund the Brewery',
      'Save enough stone before the ale buffer becomes a problem.',
      costProgress(s.resources, breweryCost),
      'Gather the required resources',
      'Open Buildings',
      breweryCost,
    );
  }

  if (s.workers.brewer === 0 && workerCap(s, 'brewer') > 0) {
    if (canAfford(s.resources, brewerCost)) {
      return {
        title: 'Hire a Brewer',
        detail: 'One brewer stabilizes ale for a small early workforce.',
        progress: 1,
        progressLabel: 'Ready to hire',
        cost: brewerCost,
        actionLabel: 'Hire Brewer',
        action: () => {
          s.hireWorker('brewer');
          sfx.coin();
        },
      };
    }
    return buildPanelGoal(
      setActivePanel,
      'workers',
      'Prepare to hire a Brewer',
      'A brewer keeps the hold out of strike territory.',
      costProgress(s.resources, brewerCost),
      'Gather the required stone',
      'Open Workers',
      brewerCost,
    );
  }

  if (s.depth < BUILDINGS.smelter.unlockDepth) {
    return buildPanelGoal(
      setActivePanel,
      'workers',
      'Push toward iron veins',
      'At 75 m the smelter and ore-to-ingot loop become relevant.',
      s.depth / BUILDINGS.smelter.unlockDepth,
      `${formatNumber(s.depth)} / ${BUILDINGS.smelter.unlockDepth} m`,
      'Review Workers',
    );
  }

  if (s.buildings.smelter === 0) {
    if (canAfford(s.resources, smelterCost)) {
      return {
        title: 'Build a Smelter',
        detail: 'Ingots unlock the next wave of upgrades and buildings.',
        progress: 1,
        progressLabel: 'Ready to build',
        cost: smelterCost,
        actionLabel: 'Build Smelter',
        action: () => {
          s.buildBuilding('smelter');
          sfx.coin();
        },
      };
    }
    return buildPanelGoal(
      setActivePanel,
      'buildings',
      'Fund the Smelter',
      'Save stone so smiths can start converting ore into ingots.',
      costProgress(s.resources, smelterCost),
      'Gather the required stone',
      'Open Buildings',
      smelterCost,
    );
  }

  if (s.workers.smith === 0 && workerCap(s, 'smith') > 0) {
    if (canAfford(s.resources, smithCost)) {
      return {
        title: 'Hire a Smith',
        detail: 'Smiths turn ore into ingots for the mid-game economy.',
        progress: 1,
        progressLabel: 'Ready to hire',
        cost: smithCost,
        actionLabel: 'Hire Smith',
        action: () => {
          s.hireWorker('smith');
          sfx.coin();
        },
      };
    }
    return buildPanelGoal(
      setActivePanel,
      'workers',
      'Prepare to hire a Smith',
      'The first smith starts the ingot pipeline.',
      costProgress(s.resources, smithCost),
      'Gather the required resources',
      'Open Workers',
      smithCost,
    );
  }

  const upgrade = UPGRADE_LIST.find(
    (u) => !s.upgrades.includes(u.id) && s.depth >= u.unlockDepth && (!u.requiresBuilding || s.buildings[u.requiresBuilding] > 0),
  );
  if (upgrade) {
    if (canAfford(s.resources, upgrade.cost)) {
      return {
        title: `Buy ${upgrade.name}`,
        detail: upgrade.description,
        progress: 1,
        progressLabel: 'Ready to buy',
        cost: upgrade.cost,
        actionLabel: 'Buy Upgrade',
        action: () => {
          s.buyUpgrade(upgrade.id);
          sfx.coin();
        },
      };
    }
    return buildPanelGoal(
      setActivePanel,
      'upgrades',
      `Save for ${upgrade.name}`,
      upgrade.description,
      costProgress(s.resources, upgrade.cost),
      'Gather the required resources',
      'Open Upgrades',
      upgrade.cost,
    );
  }

  const nextMilestone = MILESTONES.find((m) => s.depth < m.depth);
  if (nextMilestone) {
    return buildPanelGoal(
      setActivePanel,
      'milestones',
      `Reach ${nextMilestone.depth} m`,
      nextMilestone.text,
      s.depth / nextMilestone.depth,
      `${formatNumber(s.depth)} / ${nextMilestone.depth} m`,
      'Open Milestones',
    );
  }

  return buildPanelGoal(
    setActivePanel,
    'stats',
    'Keep expanding the hold',
    'All current milestones are reached. Tune the economy, push depth, and prepare future content.',
    1,
    'Current content complete',
    'Open Stats',
  );
}

function CharterCard() {
  const s = useGame();
  const charter = getCharterProgress(s);

  if (charter.allComplete) {
    return (
      <div className="goal-card charter-card">
        <p className="eyebrow">Royal Charter</p>
        <h3>The Charter is fulfilled</h3>
        <p className="desc">Every royal decree has been honored. New chapters will arrive with the next courier.</p>
      </div>
    );
  }

  const chapter = charter.chapters.find((c) => !c.complete)!;
  return (
    <div className="goal-card charter-card">
      <p className="eyebrow">
        Royal Charter · {charter.completedCount}/{charter.totalCount}
      </p>
      <h3>{chapter.chapter.title}</h3>
      <div className="charter-goals">
        {chapter.goals.map((g) => {
          const isCurrent = charter.current?.goal.id === g.goal.id;
          return (
            <div key={g.goal.id} className={`milestone-row ${g.done ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
              <span className="milestone-mark">{g.done ? '✓' : isCurrent ? '→' : '·'}</span>
              <div className="row-main">
                <strong>{g.goal.text}</strong>
                {isCurrent && (
                  <>
                    <p className="desc">
                      {formatNumber(Math.min(g.current, g.target))} / {formatNumber(g.target)}
                      {g.goal.reward && (
                        <>
                          {' '}· Reward: <CostLabel cost={g.goal.reward} />
                        </>
                      )}
                    </p>
                    <div className="goal-progress">
                      <div
                        className="goal-progress-fill"
                        style={{ width: `${Math.max(0, Math.min(100, (g.current / g.target) * 100))}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Phase 2.5: the single most pressing constraint, with its counter-move.
function BottleneckLine() {
  const s = useGame();
  const bottlenecks = getBottlenecks(s, Date.now());
  if (bottlenecks.length === 0) return null;
  const b = bottlenecks[0];
  return (
    <p className="bottleneck-line">
      Bottleneck: <strong>{b.label}</strong> — {b.hint}
    </p>
  );
}

export function OverviewPanel() {
  const s = useGame();
  const setActivePanel = useUi((u) => u.setActivePanel);
  const goal = chooseGoal(s, setActivePanel);
  const nextMilestone = MILESTONES.find((m) => s.depth < m.depth);
  const nextUpgrade = UPGRADE_LIST.find((u) => !s.upgrades.includes(u.id) && s.depth < u.unlockDepth);
  const nextDiscovery = DISCOVERIES.find((d) => !s.discoveriesSeen.includes(d.id) && s.depth < d.depth);
  const layer = layerAtDepth(s.depth);

  return (
    <div className="panel overview-panel">
      <h2>Overview</h2>
      <div className="goal-card">
        <p className="eyebrow">Next goal</p>
        <h3>{goal.title}</h3>
        <p className="desc">{goal.detail}</p>
        {goal.cost && (
          <p className="goal-cost">
            Needs <CostLabel cost={goal.cost} />
          </p>
        )}
        <div className="goal-progress">
          <div className="goal-progress-fill" style={{ width: `${Math.max(0, Math.min(100, goal.progress * 100))}%` }} />
        </div>
        <div className="goal-footer">
          <span className="desc">{goal.progressLabel}</span>
          <button onClick={goal.action}>{goal.actionLabel}</button>
        </div>
      </div>

      <CharterCard />

      <BottleneckLine />

      <div className="overview-metrics">
        <div>
          <strong>{formatNumber(s.depth)} m</strong>
          <span className="desc">Depth</span>
        </div>
        <div>
          <strong>{layer.name}</strong>
          <span className="desc">Layer</span>
        </div>
        <div>
          <strong>{totalWorkers(s)}</strong>
          <span className="desc">Workers</span>
        </div>
        <div>
          <strong>{s.upgrades.length}/{UPGRADE_LIST.length}</strong>
          <span className="desc">Upgrades</span>
        </div>
        <div>
          <strong>{s.milestonesReached.length}/{MILESTONES.length}</strong>
          <span className="desc">Milestones</span>
        </div>
      </div>

      <div className="next-list">
        {s.activeOrders.length > 0 && (
          <button className="link-row" onClick={() => setActivePanel('orders')}>
            <span>Royal Orders</span>
            <strong>{s.activeOrders.length} active</strong>
          </button>
        )}
        {nextMilestone && (
          <button className="link-row" onClick={() => setActivePanel('milestones')}>
            <span>Next milestone</span>
            <strong>{nextMilestone.depth} m</strong>
          </button>
        )}
        {nextDiscovery && (
          <button className="link-row" onClick={() => setActivePanel('milestones')}>
            <span>Next discovery</span>
            <strong>??? at {nextDiscovery.depth} m</strong>
          </button>
        )}
        {nextUpgrade && (
          <button className="link-row" onClick={() => setActivePanel('upgrades')}>
            <span>Next upgrade unlock</span>
            <strong>{nextUpgrade.name} at {nextUpgrade.unlockDepth} m</strong>
          </button>
        )}
        <button className="link-row" onClick={() => setActivePanel('stats')}>
          <span>Production and pacing</span>
          <strong>Open Stats</strong>
        </button>
      </div>
    </div>
  );
}
