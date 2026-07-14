import { useGame } from '../../game/store';
import { MineView } from '../MineView';
import { ClickButton } from '../ClickButton';
import { LAYERS, layerAtDepth } from '../../config/layers';
import { caveInChancePerSec, digSpeed } from '../../game/economy';

export function MineStage() {
  const depth = useGame((s) => s.depth);
  const digMode = useGame((s) => s.digMode);
  const setDigMode = useGame((s) => s.setDigMode);
  const caveInUntil = useGame((s) => s.caveInUntil);
  const speed = useGame((s) => digSpeed(s, Date.now()));
  const risk = useGame((s) => caveInChancePerSec(s));
  const layer = layerAtDepth(depth);
  const next = LAYERS.find((l) => l.depth > depth);
  const now = Date.now();
  const stunned = caveInUntil > now;

  return (
    <section className="mine-stage">
      <div className="surface-strip" aria-hidden="true">
        <span>⛰️</span>
        <span>🏘️</span>
        <span>🌲</span>
      </div>
      <div className="mine-frame">
        <MineView />
      </div>
      <ClickButton />
      <div className="panel layer-card">
        <h2>Depth: {Math.floor(depth)} m</h2>
        <p className="layer-name">
          <span className="layer-swatch" style={{ background: layer.color }} />
          {layer.name}
        </p>
        <p className="desc">{layer.flavor}</p>
        {next && (
          <p className="desc">
            Next layer: {next.name} at {next.depth} m
          </p>
        )}
        <p className="desc">Dig speed: {speed.toFixed(2)} m/s</p>
      </div>
      <div className="panel digmode-card">
        <div className="dig-mode">
          <button className={digMode === 'careful' ? 'active' : ''} onClick={() => setDigMode('careful')}>
            Careful
          </button>
          <button className={digMode === 'reckless' ? 'active' : ''} onClick={() => setDigMode('reckless')}>
            Reckless (x2)
          </button>
        </div>
        <p className="desc">Cave-in risk: {(risk * 100).toFixed(1)}%/s</p>
        {stunned && (
          <p className="warning">
            CAVE-IN! The dwarves are digging out... ({Math.ceil((caveInUntil - now) / 1000)}s)
          </p>
        )}
      </div>
    </section>
  );
}
