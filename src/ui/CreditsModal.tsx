import { useUi } from './uiStore';
import { resetGame } from '../game/boot';

const AUTHORS = ['Lorc', 'Delapouite', 'Faithtoken']; // keep in sync with CREDITS.md

export function CreditsModal() {
  const open = useUi((u) => u.creditsOpen);
  const setCreditsOpen = useUi((u) => u.setCreditsOpen);
  if (!open) return null;

  const onReset = () => {
    if (!window.confirm('Delete ALL progress and start over? This cannot be undone.')) return;
    resetGame();
    setCreditsOpen(false);
  };

  return (
    <div className="modal-backdrop" onClick={() => setCreditsOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Credits</h2>
        <p className="desc">Icons by {AUTHORS.join(', ')} from game-icons.net (CC BY 3.0).</p>
        <button onClick={() => setCreditsOpen(false)}>Close</button>
        <button className="reset-btn" onClick={onReset}>
          Reset save
        </button>
      </div>
    </div>
  );
}
