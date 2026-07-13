import { useState } from 'react';
import { WorkersPanel } from './WorkersPanel';
import { BuildingsPanel } from './BuildingsPanel';
import { UpgradesPanel } from './UpgradesPanel';

const TABS = ['workers', 'buildings', 'upgrades'] as const;
type Tab = (typeof TABS)[number];

export function SidePanels() {
  const [tab, setTab] = useState<Tab>('workers');
  return (
    <div className="side-panels">
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'workers' && <WorkersPanel />}
      {tab === 'buildings' && <BuildingsPanel />}
      {tab === 'upgrades' && <UpgradesPanel />}
    </div>
  );
}
