import { useGame } from '../game/store';
import { getAleForecast } from '../game/forecast';
import { formatDuration, formatNumber } from '../game/format';
import { Icon } from './Icon';

const MORALE_TEXT = {
  idle: 'Hire some dwarves to get digging.',
  merry: '😊 The dwarves work merrily',
  thirsty: '😅 Thirsty — work is slowing down',
  dry: '🪧 DRY — no ale, work crawls!',
} as const;

export function AleStatus() {
  const s = useGame();
  const f = getAleForecast(s, Date.now());
  const ratio = f.storage > 0 ? s.resources.ale / f.storage : 0;
  const netLabel = `${f.netAle >= 0 ? '+' : ''}${f.netAle.toFixed(2)}/s`;

  return (
    <div className={`panel ale-status ale-${f.moraleState}`} data-hint="ale-status">
      <div className="bar">
        <div className="bar-fill" style={{ width: `${Math.min(100, ratio * 100)}%` }} />
      </div>
      <p>
        <Icon id="ale" /> {formatNumber(s.resources.ale)}/{formatNumber(f.storage)}
        <span className="desc"> · Net Ale: {netLabel}</span>
      </p>
      <p className="desc ale-forecast-line">
        {f.timeToDry !== null && <>Dry in {formatDuration(f.timeToDry)}</>}
        {f.timeToFull !== null && <>Storage full in {formatDuration(f.timeToFull)}</>}
        {f.timeToDry === null && f.timeToFull === null && f.workers > 0 && <>Supply is stable</>}
      </p>
      {f.recommendedBrewers > 0 && Number.isFinite(f.recommendedBrewers) && s.buildings.brewery > 0 && (
        <p className="desc ale-recommend">
          {f.recommendedBrewers === 1
            ? '1 more Brewer stabilizes this shift'
            : `${f.recommendedBrewers} more Brewers stabilize this shift`}
        </p>
      )}
      <p className="morale">{MORALE_TEXT[f.moraleState]}</p>
    </div>
  );
}
