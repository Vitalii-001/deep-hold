import { BALANCE } from '../config/balance';
import { BUILDINGS } from '../config/buildings';
import { layerAtDepth } from '../config/layers';
import { MILESTONES } from '../config/milestones';
import { UPGRADE_LIST } from '../config/upgrades';
import { useGame } from '../game/store';
import { aleStorage, caveInChancePerSec, productionRates } from '../game/economy';
import { formatNumber, formatDuration } from '../game/format';
import { Icon } from './Icon';

function formatRate(n: number): string {
  if (n === 0) return '0';
  if (Math.abs(n) < 10) return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return formatNumber(n);
}

export function StatsPanel() {
  const s = useGame();
  const now = Date.now();
  const layer = layerAtDepth(s.depth);
  const rates = productionRates(s, now);
  const buildingLevels = Object.values(s.buildings).reduce((sum, level) => sum + level, 0);
  const blessingLeft = Math.max(0, (s.blessingUntil - now) / 1000);
  const caveInLeft = Math.max(0, (s.caveInUntil - now) / 1000);
  const secondaryRates = Object.entries(rates.secondary).filter(([, value]) => (value ?? 0) > 0);

  return (
    <div className="panel stats-panel">
      <h2>Stats</h2>
      <div className="stat-grid">
        <div className="stat-row">
          <span>Current layer</span>
          <strong>{layer.name}</strong>
        </div>
        <div className="stat-row">
          <span>Depth speed</span>
          <strong>{formatRate(rates.dig)} m/s</strong>
        </div>
        <div className="stat-row">
          <span>Mining</span>
          <strong>+{formatRate(rates.mining)} stone/s</strong>
        </div>
        {secondaryRates.map(([id, value]) => (
          <div key={id} className="stat-row">
            <span>
              <Icon id={id} /> Layer yield
            </span>
            <strong>+{formatRate(value ?? 0)}/s</strong>
          </div>
        ))}
        <div className="stat-row">
          <span>Smelting</span>
          <strong>+{formatRate(rates.smelt)} ingot/s</strong>
        </div>
        <div className="stat-row">
          <span>Brewing</span>
          <strong>+{formatRate(rates.brew)} ale/s</strong>
        </div>
        <div className="stat-row">
          <span>Ale drink</span>
          <strong>-{formatRate(rates.aleDrink)} ale/s</strong>
        </div>
        <div className="stat-row">
          <span>Ale storage</span>
          <strong>{formatNumber(s.resources.ale)} / {formatNumber(aleStorage(s))}</strong>
        </div>
        <div className="stat-row">
          <span>Work multiplier</span>
          <strong>x{formatRate(rates.workMult)}</strong>
        </div>
        <div className="stat-row">
          <span>Cave-in risk</span>
          <strong>{formatRate(caveInChancePerSec(s) * 100)}%/s</strong>
        </div>
        {caveInLeft > 0 && (
          <div className="stat-row warning-row">
            <span>Cave-in recovery</span>
            <strong>{formatDuration(caveInLeft)}</strong>
          </div>
        )}
        <div className="stat-row">
          <span>Blessing</span>
          <strong>{blessingLeft > 0 ? formatDuration(blessingLeft) : 'Inactive'}</strong>
        </div>
      </div>

      <div className="stat-summary">
        <div>
          <strong>{rates.workers}</strong>
          <span className="desc">workers</span>
        </div>
        <div>
          <strong>{buildingLevels}</strong>
          <span className="desc">building levels</span>
        </div>
        <div>
          <strong>{s.upgrades.length}/{UPGRADE_LIST.length}</strong>
          <span className="desc">upgrades</span>
        </div>
        <div>
          <strong>{s.milestonesReached.length}/{MILESTONES.length}</strong>
          <span className="desc">milestones</span>
        </div>
        <div>
          <strong>{Object.values(BUILDINGS).filter((b) => s.depth >= b.unlockDepth).length}/{Object.values(BUILDINGS).length}</strong>
          <span className="desc">buildings revealed</span>
        </div>
        <div>
          <strong>{BALANCE.offline.capHours}h</strong>
          <span className="desc">offline cap</span>
        </div>
      </div>
    </div>
  );
}
