import { useGame } from '../game/store';
import { BUILDINGS } from '../config/buildings';
import { BREW_MODE_LIST } from '../config/brewModes';
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
              {maxed ? (
                <p className="desc">Max level — {b.description}</p>
              ) : (
                <p className="build-delta">
                  Lv {level} → {level + 1}: <span>{b.description}</span>
                </p>
              )}
              {b.id === 'brewery' && level >= 1 && (
                <div className="brew-modes">
                  {BREW_MODE_LIST.map((m) => (
                    <button
                      key={m.id}
                      className={s.brewMode === m.id ? 'active' : ''}
                      title={m.description}
                      onClick={() => s.setBrewMode(m.id)}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
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
