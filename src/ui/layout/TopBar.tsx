import { useGame } from '../../game/store';
import { useUi } from '../uiStore';
import { ResourceBar } from '../ResourceBar';
import { MuteButton } from '../MuteButton';
import { TopNav } from './TopNav';
import { LAYERS, layerAtDepth } from '../../config/layers';
import { BALANCE } from '../../config/balance';
import { formatDuration } from '../../game/format';
import { sfx } from '../sfx';

// Feast (Phase 1.4, §6.3): ale sink in the old Hall-button slot. Hidden until
// the first brewery; shows cost when ready, remaining time while active or
// cooling down. Placeholder styling — design pass comes later.
function FeastButton() {
  const brewery = useGame((s) => s.buildings.brewery);
  const ale = useGame((s) => s.resources.ale);
  const playedSec = useGame((s) => s.playedSec);
  const feastUntilSec = useGame((s) => s.feastUntilSec);
  const feastCooldownUntilSec = useGame((s) => s.feastCooldownUntilSec);
  const holdFeast = useGame((s) => s.holdFeast);
  const pushToast = useUi((u) => u.pushToast);

  if (brewery < 1) return null;

  const active = playedSec < feastUntilSec;
  const cooling = !active && playedSec < feastCooldownUntilSec;
  const affordable = ale >= BALANCE.feast.aleCost;
  const label = active
    ? `🍻 Feasting ${formatDuration(feastUntilSec - playedSec)}`
    : cooling
      ? `🍻 ${formatDuration(feastCooldownUntilSec - playedSec)}`
      : `🍻 Feast (${BALANCE.feast.aleCost}🍺)`;

  return (
    <button
      className={`feast-btn ${active ? 'active' : ''}`}
      disabled={active || cooling || !affordable}
      title={`Hold a feast: ${BALANCE.feast.aleCost} ale for +${Math.round((BALANCE.feast.productionMult - 1) * 100)}% production (${Math.round(BALANCE.feast.durationSec / 60)} min)`}
      onClick={() => {
        holdFeast();
        pushToast('🍻 The Hold feasts! Production surges.');
        sfx.burp();
      }}
    >
      {label}
    </button>
  );
}

export function TopBar() {
  const depth = useGame((s) => s.depth);
  const setActivePanel = useUi((u) => u.setActivePanel);
  const setCreditsOpen = useUi((u) => u.setCreditsOpen);
  const setSettingsOpen = useUi((u) => u.setSettingsOpen);
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
      <div className="topbar-main">
        <div className="topbar-row">
          <ResourceBar />
          <div className="topbar-actions">
            <FeastButton />
            <button className="shop-btn" onClick={() => setActivePanel('adBoosts')}>
              🛒 Shop
            </button>
            <button className="credits-link" onClick={() => setCreditsOpen(true)}>
              Credits
            </button>
            <button className="settings-btn" onClick={() => setSettingsOpen(true)} title="Settings">
              ⚙
            </button>
            <MuteButton />
          </div>
        </div>
        <TopNav />
      </div>
    </header>
  );
}
