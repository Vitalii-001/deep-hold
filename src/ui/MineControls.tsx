import { useGame } from '../game/store';
import { LAYERS, layerAtDepth, nextLayer } from '../config/layers';
import { MINING_METHOD_LIST } from '../config/miningMethods';
import { SURVEY_BONUSES } from '../config/survey';
import { caveInChancePerSec, digSpeed } from '../game/economy';

// Rally / Overseer Command lives at the dig face now (mine/MineActivityLayer,
// MINE_SCREEN.md §6.1) — this panel keeps the layer card + method switcher.

export function MineControls() {
  const s = useGame();
  const depth = s.depth;
  const speed = digSpeed(s, Date.now());
  const risk = caveInChancePerSec(s);
  const layer = layerAtDepth(depth);
  const next = LAYERS.find((l) => l.depth > depth);
  const surveyTarget = nextLayer(depth);
  const surveyPct = surveyTarget ? (s.surveyProgress[surveyTarget.id] ?? 0) : 0;
  const surveyBonus = surveyTarget ? s.surveyBonuses[surveyTarget.id] : undefined;
  const now = Date.now();
  const stunned = s.caveInUntil > now;
  const methodsUnlocked = s.buildings.smelter >= 1; // R6: one new concept per unlock

  return (
    <div className="mine-controls">
      <div className="panel layer-card">
        <h2>Depth: {Math.floor(depth)} m</h2>
        <p className="layer-name">
          <span className="layer-swatch" style={{ background: layer.color }} />
          {layer.name}
          <span className="desc"> · Hardness ×{layer.hardness}</span>
        </p>
        <p className="desc">{layer.flavor}</p>
        {next && (
          <p className="desc">
            Next layer: {next.name} at {next.depth} m (hardness ×{next.hardness})
          </p>
        )}
        <p className="desc">Dig speed: {speed.toFixed(3)} m/s</p>
        {surveyTarget && s.workers.scout > 0 && (
          <p className="desc survey-line">
            {surveyBonus
              ? `Survey: ${SURVEY_BONUSES.find((b) => b.id === surveyBonus)?.name ?? surveyBonus}`
              : `Surveying ${surveyTarget.name}: ${Math.floor(surveyPct)}%`}
          </p>
        )}
        {stunned && (
          <p className="warning">
            CAVE-IN! The dwarves are digging out... ({Math.ceil((s.caveInUntil - now) / 1000)}s)
          </p>
        )}
      </div>
      {methodsUnlocked && (
        <div className="panel digmode-card">
          <div className="dig-mode">
            {MINING_METHOD_LIST.map((m) => (
              <button
                key={m.id}
                className={s.miningMethod === m.id ? 'active' : ''}
                title={m.description}
                onClick={() => s.setMiningMethod(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
          <p className="desc">Cave-in risk: {(risk * 100).toFixed(1)}%/s</p>
        </div>
      )}
    </div>
  );
}
