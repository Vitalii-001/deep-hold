import { useGame } from '../game/store';
import { WORKERS } from '../config/workers';
import { BUILDINGS } from '../config/buildings';
import { BALANCE } from '../config/balance';
import { canAfford, workerCap, workerCost } from '../game/economy';
import { Icon } from './Icon';
import { CostLabel } from './CostLabel';
import { sfx } from './sfx';

export function WorkersPanel() {
  const s = useGame();
  return (
    <div className="panel">
      {Object.values(WORKERS).map((w) => {
        const count = s.workers[w.id];
        const cap = workerCap(s, w.id);
        const cost = workerCost(s, w.id);
        const locked = cap === 0;
        return (
          <div key={w.id} data-hint={`worker-${w.id}`} className="row">
            <Icon id={w.id} />
            <div className="row-main">
              <strong>{w.name}</strong> <span className="desc">{count}/{cap}</span>
              <p className="desc">{w.description}</p>
            </div>
            <button
              disabled={locked || count >= cap || !canAfford(s.resources, cost)}
              onClick={() => { s.hireWorker(w.id); sfx.coin(); }}
            >
              {locked ? `Needs ${BUILDINGS[BALANCE.caps[w.id].building].name}` : <CostLabel cost={cost} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
