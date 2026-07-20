import { useGame } from '../game/store';
import { AdBoosts } from './AdBoosts';

export function AdBoostsPanel() {
  const brewery = useGame((s) => s.buildings.brewery);
  const temple = useGame((s) => s.buildings.temple);
  return (
    <div className="panel">
      <AdBoosts />
      {brewery < 1 && (
        <div className="row locked">
          <div className="row-main">
            <strong>Free Barrel of Ale</strong>
            <p className="desc">Build a Brewery to unlock Free Barrel of Ale.</p>
          </div>
        </div>
      )}
      {temple < 1 && (
        <div className="row locked">
          <div className="row-main">
            <strong>Ancestors' Blessing</strong>
            <p className="desc">Build a Temple to unlock Ancestors' Blessing.</p>
          </div>
        </div>
      )}
    </div>
  );
}
