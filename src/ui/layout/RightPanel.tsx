import { useUi } from '../uiStore';
import { AleStatus } from '../AleStatus';
import { WorkersPanel } from '../WorkersPanel';
import { BuildingsPanel } from '../BuildingsPanel';
import { UpgradesPanel } from '../UpgradesPanel';
import { AdBoostsPanel } from '../AdBoostsPanel';

export function RightPanel() {
  const activePanel = useUi((u) => u.activePanel);
  return (
    <aside className="right-panel">
      <AleStatus />
      {activePanel === 'workers' && <WorkersPanel />}
      {activePanel === 'buildings' && <BuildingsPanel />}
      {activePanel === 'upgrades' && <UpgradesPanel />}
      {activePanel === 'adBoosts' && <AdBoostsPanel />}
    </aside>
  );
}
