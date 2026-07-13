import { useGame } from '../game/store';
import { UPGRADE_LIST } from '../config/upgrades';
import { BUILDINGS } from '../config/buildings';
import { canAfford } from '../game/economy';
import { CostLabel } from './CostLabel';

export function UpgradesPanel() {
  const s = useGame();
  const visible = UPGRADE_LIST.filter((u) => !s.upgrades.includes(u.id) && s.depth >= u.unlockDepth);
  return (
    <div className="panel">
      <p className="desc">Owned: {s.upgrades.length}/{UPGRADE_LIST.length}</p>
      {visible.length === 0 && <p className="desc">Nothing new for sale. Dig deeper!</p>}
      {visible.map((u) => {
        const needsBuilding = u.requiresBuilding && s.buildings[u.requiresBuilding] < 1;
        return (
          <div key={u.id} className="row">
            <div className="row-main">
              <strong>{u.name}</strong>
              <p className="desc">{u.description}</p>
              {needsBuilding && <p className="warning">Requires {BUILDINGS[u.requiresBuilding!].name}</p>}
            </div>
            <button
              disabled={!!needsBuilding || !canAfford(s.resources, u.cost)}
              onClick={() => s.buyUpgrade(u.id)}
            >
              <CostLabel cost={u.cost} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
