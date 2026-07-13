import { useGame } from '../game/store';

export function MuteButton() {
  const muted = useGame((s) => s.muted);
  const toggleMuted = useGame((s) => s.toggleMuted);
  return (
    <button className="mute-btn" onClick={toggleMuted} title="Toggle sound">
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
