import { useGame } from '../../game/store';
import { useUi } from '../uiStore';
import { ResourceBar } from '../ResourceBar';
import { MuteButton } from '../MuteButton';
import { LAYERS, layerAtDepth } from '../../config/layers';

export function TopBar() {
  const depth = useGame((s) => s.depth);
  const setActivePanel = useUi((u) => u.setActivePanel);
  const setCreditsOpen = useUi((u) => u.setCreditsOpen);
  const layer = layerAtDepth(depth);
  const next = LAYERS.find((l) => l.depth > depth);
  const progress = next
    ? Math.min(100, ((depth - layer.depth) / (next.depth - layer.depth)) * 100)
    : 100;
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="king-portrait" role="img" aria-label="Dwarf King">
          👑
        </span>
        <div>
          <h1>Deep Hold</h1>
          <div
            className="depth-progress"
            title={next ? `Next: ${next.name} at ${next.depth} m` : 'Deepest layer reached'}
          >
            <span className="depth-progress-label">
              {Math.floor(depth)} m · {layer.name}
            </span>
            <div className="depth-progress-track">
              <div className="depth-progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
      <ResourceBar />
      <div className="topbar-actions">
        <button className="shop-btn" onClick={() => setActivePanel('adBoosts')}>
          🛒 Shop
        </button>
        <button className="credits-link" onClick={() => setCreditsOpen(true)}>
          Credits
        </button>
        <MuteButton />
      </div>
    </header>
  );
}
