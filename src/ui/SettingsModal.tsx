import { resetGame } from '../game/boot';
import { useGame } from '../game/store';
import { useUi } from './uiStore';
import { useUiSettings } from './uiSettings';

export function SettingsModal() {
  const open = useUi((u) => u.settingsOpen);
  const setSettingsOpen = useUi((u) => u.setSettingsOpen);
  const openConfirmation = useUi((u) => u.openConfirmation);
  const muted = useGame((s) => s.muted);
  const toggleMuted = useGame((s) => s.toggleMuted);
  const replayIntro = useGame((s) => s.replayIntro);
  const particlesEnabled = useUiSettings((s) => s.particlesEnabled);
  const highContrast = useUiSettings((s) => s.highContrast);
  const compactMode = useUiSettings((s) => s.compactMode);
  const masterVolume = useUiSettings((s) => s.masterVolume);
  const sfxVolume = useUiSettings((s) => s.sfxVolume);
  const setParticlesEnabled = useUiSettings((s) => s.setParticlesEnabled);
  const setHighContrast = useUiSettings((s) => s.setHighContrast);
  const setCompactMode = useUiSettings((s) => s.setCompactMode);
  const setMasterVolume = useUiSettings((s) => s.setMasterVolume);
  const setSfxVolume = useUiSettings((s) => s.setSfxVolume);

  if (!open) return null;

  const confirmReset = () => {
    openConfirmation({
      title: 'Reset save?',
      message: 'Delete all progress and start over? This cannot be undone.',
      confirmLabel: 'Reset save',
      danger: true,
      onConfirm: () => {
        resetGame();
        setSettingsOpen(false);
      },
    });
  };

  return (
    <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>

        <section className="settings-section">
          <h3>Audio</h3>
          <label className="setting-row">
            <span>
              Mute
              <small>Silence all generated sound effects.</small>
            </span>
            <input type="checkbox" checked={muted} onChange={toggleMuted} />
          </label>
          <label className="slider-row">
            <span>Master volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(masterVolume * 100)}
              onChange={(e) => setMasterVolume(Number(e.currentTarget.value) / 100)}
            />
            <strong>{Math.round(masterVolume * 100)}%</strong>
          </label>
          <label className="slider-row">
            <span>SFX volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(sfxVolume * 100)}
              onChange={(e) => setSfxVolume(Number(e.currentTarget.value) / 100)}
            />
            <strong>{Math.round(sfxVolume * 100)}%</strong>
          </label>
        </section>

        <section className="settings-section">
          <h3>Display</h3>
          <label className="setting-row">
            <span>
              Particles
              <small>Show stone chips when clicking MINE.</small>
            </span>
            <input
              type="checkbox"
              checked={particlesEnabled}
              onChange={(e) => setParticlesEnabled(e.currentTarget.checked)}
            />
          </label>
          <label className="setting-row">
            <span>
              High contrast
              <small>Increase text and border contrast.</small>
            </span>
            <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.currentTarget.checked)} />
          </label>
          <label className="setting-row">
            <span>
              Compact UI
              <small>Tighten spacing for smaller portal frames.</small>
            </span>
            <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.currentTarget.checked)} />
          </label>
        </section>

        <section className="settings-section">
          <h3>Help</h3>
          <button
            onClick={() => {
              replayIntro();
              setSettingsOpen(false);
            }}
          >
            Replay Intro
          </button>
        </section>

        <section className="settings-section danger-zone">
          <h3>Save</h3>
          <button className="reset-btn" onClick={confirmReset}>
            Reset save
          </button>
        </section>

        <button onClick={() => setSettingsOpen(false)}>Close</button>
      </div>
    </div>
  );
}
