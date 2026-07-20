import { useUi } from './uiStore';

// Full-screen blocker while a rewarded ad plays (CrazyGames: the UI must stay
// blocked until adFinished/adError). The real ad renders in the portal layer;
// this just keeps our game inert underneath.
export function AdOverlay() {
  const adPlaying = useUi((u) => u.adPlaying);
  if (!adPlaying) return null;
  return (
    <div className="modal-backdrop ad-overlay">
      <div className="modal ad-overlay-card">
        <h2>📺 Ad break</h2>
        <p className="desc">The dwarves put down their picks for a moment...</p>
      </div>
    </div>
  );
}
