import { useUi } from './uiStore';
import { formatDuration, formatNumber } from '../game/format';
import { Icon } from './Icon';

export function OfflineModal() {
  const summary = useUi((u) => u.offlineSummary);
  const setOfflineSummary = useUi((u) => u.setOfflineSummary);
  if (!summary) return null;
  const entries = Object.entries(summary.gained).filter(([, v]) => v >= 1);
  return (
    <div className="modal-backdrop" onClick={() => setOfflineSummary(null)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Welcome back, my King!</h2>
        <p className="desc">
          While you were away ({formatDuration(summary.elapsedSec)}), the dwarves kept the hold moving:
        </p>
        {summary.events.length > 0 && (
          <ul>
            {summary.events.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
        )}
        <ul>
          {entries.map(([k, v]) => (
            <li key={k}>
              <Icon id={k} /> +{formatNumber(v)}
            </li>
          ))}
          {summary.metersDug >= 1 && <li>⛏️ Dug {formatNumber(summary.metersDug)} m deeper</li>}
        </ul>
        <button onClick={() => setOfflineSummary(null)}>To work!</button>
      </div>
    </div>
  );
}
