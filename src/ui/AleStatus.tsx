import { useGame } from '../game/store';
import { WORKERS } from '../config/workers';
import { BALANCE } from '../config/balance';
import { aleStorage, isStriking, statMult } from '../game/economy';
import { formatNumber } from '../game/format';
import { Icon } from './Icon';

export function AleStatus() {
  const s = useGame();
  const now = Date.now();
  const storage = aleStorage(s);
  const totalWorkers = s.workers.miner + s.workers.smith + s.workers.brewer + s.workers.scout;
  const drink = (totalWorkers * BALANCE.ale.consumptionPerWorker) / statMult(s, 'aleThrift', now);
  const morale = s.resources.ale >= drink * 0.1 ? BALANCE.ale.happyMult : BALANCE.ale.strikeMult;
  const stun = s.caveInUntil > now ? BALANCE.dig.caveIn.stunMult : 1;
  const brew = s.workers.brewer * WORKERS.brewer.baseRate * statMult(s, 'brew', now) * morale * stun;
  const striking = isStriking(s);
  return (
    <div className={`panel ale-status ${striking ? 'strike' : ''}`}>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${Math.min(100, (s.resources.ale / storage) * 100)}%` }} />
      </div>
      <p>
        <Icon id="ale" /> {formatNumber(s.resources.ale)}/{formatNumber(storage)}
        <span className="desc"> (+{brew.toFixed(1)}/s, −{drink.toFixed(1)}/s)</span>
      </p>
      <p className="morale">
        {striking
          ? '🪧 ON STRIKE — no ale, work crawls!'
          : totalWorkers > 0
            ? '😊 The dwarves work merrily'
            : 'Hire some dwarves to get digging.'}
      </p>
    </div>
  );
}
