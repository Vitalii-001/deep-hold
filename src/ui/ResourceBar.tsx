import { useGame } from '../game/store';
import { BALANCE } from '../config/balance';
import { formatNumber } from '../game/format';
import { Icon } from './Icon';
import type { ResourceId } from '../game/types';

const ORDER: ResourceId[] = ['stone', 'ore', 'ingot', 'gold', 'gem', 'ale'];

export function ResourceBar() {
  const resources = useGame((s) => s.resources);
  const depth = useGame((s) => s.depth);
  const crowns = useGame((s) => s.crowns);
  const tradingPost = useGame((s) => s.buildings.tradingPost);
  return (
    <div className="resource-bar">
      {ORDER.filter((id) => depth >= BALANCE.reveal[id]).map((id) => (
        <span key={id} className="resource" title={id}>
          <Icon id={id} /> {formatNumber(resources[id])}
        </span>
      ))}
      {/* Crowns appear once the Trading Post is built (§3) */}
      {tradingPost >= 1 && (
        <span className="resource resource-crown" title="Crowns">
          <Icon id="crown" /> {formatNumber(crowns)}
        </span>
      )}
    </div>
  );
}
