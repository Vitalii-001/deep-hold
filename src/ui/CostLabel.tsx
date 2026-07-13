import type { Cost } from '../game/types';
import { formatNumber } from '../game/format';
import { Icon } from './Icon';

export function CostLabel({ cost }: { cost: Cost }) {
  return (
    <span className="cost-label">
      {Object.entries(cost).map(([k, v]) => (
        <span key={k}>
          <Icon id={k} />
          {formatNumber(v as number)}
        </span>
      ))}
    </span>
  );
}
