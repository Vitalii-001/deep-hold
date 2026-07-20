import { MILESTONES } from '../config/milestones';
import { DISCOVERIES } from '../config/discoveries';
import { useGame } from '../game/store';
import { formatNumber } from '../game/format';

export function MilestonesPanel() {
  const depth = useGame((s) => s.depth);
  const reached = useGame((s) => s.milestonesReached);
  const discoveriesSeen = useGame((s) => s.discoveriesSeen);
  const discoveryChoices = useGame((s) => s.discoveryChoices);
  const reachedSet = new Set(reached);
  const next = MILESTONES.find((m) => depth < m.depth);

  return (
    <div className="panel milestones-panel">
      <h2>Milestones</h2>
      <p className="desc">
        Reached {reached.length}/{MILESTONES.length}. Current depth: {formatNumber(depth)} m.
      </p>
      <div className="milestone-list">
        {MILESTONES.map((m) => {
          const done = reachedSet.has(m.id);
          const current = next?.id === m.id;
          return (
            <div key={m.id} className={`milestone-row ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
              <span className="milestone-mark">{done ? '✓' : current ? '→' : '·'}</span>
              <div className="row-main">
                <strong>{m.depth} m</strong>
                <p className="desc">{m.text}</p>
                <p className="build-delta">Reward: +{Math.round((m.mult - 1) * 100)}% production {done ? '(active)' : ''}</p>
                {current && (
                  <div className="goal-progress">
                    <div className="goal-progress-fill" style={{ width: `${Math.max(0, Math.min(100, (depth / m.depth) * 100))}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2>Discoveries</h2>
      <p className="desc">
        Found {discoveriesSeen.length}/{DISCOVERIES.length}. The mountain hides more below.
      </p>
      <div className="milestone-list">
        {DISCOVERIES.map((d) => {
          const seen = discoveriesSeen.includes(d.id);
          const choice = d.options.find((o) => o.id === discoveryChoices[d.id]);
          return (
            <div key={d.id} className={`milestone-row ${seen ? 'done' : ''}`}>
              <span className="milestone-mark">{seen ? '✓' : '?'}</span>
              <div className="row-main">
                <strong>{seen ? d.name : '???'}</strong>
                <p className="desc">
                  {seen && choice ? `${d.depth} m — ${choice.label}` : `Something waits at ${d.depth} m...`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
