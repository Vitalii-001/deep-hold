import { useGame } from '../game/store';
import { LAYERS, layerAtDepth } from '../config/layers';
import { digSpeed } from '../game/economy';

export function DepthPanel() {
  const depth = useGame((s) => s.depth);
  const digMode = useGame((s) => s.digMode);
  const setDigMode = useGame((s) => s.setDigMode);
  const caveInUntil = useGame((s) => s.caveInUntil);
  const speed = useGame((s) => digSpeed(s, Date.now()));
  const layer = layerAtDepth(depth);
  const next = LAYERS.find((l) => l.depth > depth);
  const now = Date.now();

  return (
    <div className="panel depth-panel">
      <h2>Depth: {Math.floor(depth)} m</h2>
      <p className="layer-name" style={{ color: layer.color }}>{layer.name}</p>
      <p className="desc">{layer.flavor}</p>
      {next && <p className="desc">Next layer at {next.depth} m</p>}
      <p className="desc">Dig speed: {speed.toFixed(2)} m/s</p>
      <div className="dig-mode">
        <button className={digMode === 'careful' ? 'active' : ''} onClick={() => setDigMode('careful')}>
          Careful
        </button>
        <button className={digMode === 'reckless' ? 'active' : ''} onClick={() => setDigMode('reckless')}>
          Reckless (x2, cave-in risk!)
        </button>
      </div>
      {caveInUntil > now && (
        <p className="warning">
          CAVE-IN! The dwarves are digging themselves out... ({Math.ceil((caveInUntil - now) / 1000)}s)
        </p>
      )}
    </div>
  );
}
