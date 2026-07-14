import { useUi, type ActivePanel } from './uiStore';
import { WorkersPanel } from './WorkersPanel';
import { BuildingsPanel } from './BuildingsPanel';
import { UpgradesPanel } from './UpgradesPanel';

const TABS: ActivePanel[] = ['workers', 'buildings', 'upgrades'];

export function SidePanels() {
  const activePanel = useUi((u) => u.activePanel);
  const setActivePanel = useUi((u) => u.setActivePanel);
  return (
    <div className="side-panels">
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            data-hint={`tab-${t}`}
            className={activePanel === t ? 'active' : ''}
            onClick={() => setActivePanel(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {activePanel === 'workers' && <WorkersPanel />}
      {activePanel === 'buildings' && <BuildingsPanel />}
      {activePanel === 'upgrades' && <UpgradesPanel />}
    </div>
  );
}
