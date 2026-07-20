import { useUi } from '../uiStore';
import { AleStatus } from '../AleStatus';
import { WorkersPanel } from '../WorkersPanel';
import { BuildingsPanel } from '../BuildingsPanel';
import { UpgradesPanel } from '../UpgradesPanel';
import { AdBoostsPanel } from '../AdBoostsPanel';
import { OverviewPanel } from '../OverviewPanel';
import { MilestonesPanel } from '../MilestonesPanel';
import { StatsPanel } from '../StatsPanel';
import { MineControls } from '../MineControls';
import { OrdersPanel } from '../OrdersPanel';

export function RightPanel() {
  const activePanel = useUi((u) => u.activePanel);
  return (
    <aside className="right-panel">
      <AleStatus />
      <div className="active-panel-slot">
        {activePanel === 'overview' && <OverviewPanel />}
        {activePanel === 'workers' && <WorkersPanel />}
        {activePanel === 'buildings' && <BuildingsPanel />}
        {activePanel === 'upgrades' && <UpgradesPanel />}
        {activePanel === 'orders' && <OrdersPanel />}
        {activePanel === 'milestones' && <MilestonesPanel />}
        {activePanel === 'stats' && <StatsPanel />}
        {activePanel === 'adBoosts' && <AdBoostsPanel />}
      </div>
      <div className="desktop-mine-controls">
        <MineControls />
      </div>
    </aside>
  );
}
