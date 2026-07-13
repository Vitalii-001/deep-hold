import { useGame } from '../game/store';
import { BUILDINGS } from '../config/buildings';
import { buildingCost, canAfford } from '../game/economy';
import { Icon } from './Icon';
import { CostLabel } from './CostLabel';
import { sfx } from './sfx';

export function BuildingsPanel() {
  const s = useGame();
  return (
    <div className="panel">
      {Object.values(BUILDINGS).map((b) => {
        if (s.depth < b.unlockDepth) {
          return (
            <div key={b.id} className="row locked">
              <span>❓</span>
              <div className="row-main">
                <strong>???</strong>
                <p className="desc">Unlocks at {b.unlockDepth} m</p>
              </div>
            </div>
          );
        }
        const level = s.buildings[b.id];
        const cost = buildingCost(s, b.id);
        const maxed = level >= b.maxLevel;
        return (
          <div key={b.id} data-hint={`building-${b.id}`} className="row">
            <Icon id={b.id} />
            <div className="row-main">
              <strong>{b.name}</strong> <span className="desc">Lv {level}/{b.maxLevel}</span>
              <p className="desc">{b.description}</p>
            </div>
            <button disabled={maxed || !canAfford(s.resources, cost)} onClick={() => { s.buildBuilding(b.id); sfx.coin(); }}>
              {maxed ? 'MAX' : <CostLabel cost={cost} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
