import { useUi, type PanelTab } from './uiStore';
import { WorkersPanel } from './WorkersPanel';
import { BuildingsPanel } from './BuildingsPanel';
import { UpgradesPanel } from './UpgradesPanel';

const TABS: PanelTab[] = ['workers', 'buildings', 'upgrades'];

export function SidePanels() {
  const activeTab = useUi((u) => u.activeTab);
  const setActiveTab = useUi((u) => u.setActiveTab);
  return (
    <div className="side-panels">
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            data-hint={`tab-${t}`}
            className={activeTab === t ? 'active' : ''}
            onClick={() => setActiveTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {activeTab === 'workers' && <WorkersPanel />}
      {activeTab === 'buildings' && <BuildingsPanel />}
      {activeTab === 'upgrades' && <UpgradesPanel />}
    </div>
  );
}
