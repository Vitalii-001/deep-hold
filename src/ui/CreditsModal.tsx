import { useUi } from './uiStore';

const AUTHORS = ['Lorc', 'Delapouite', 'Faithtoken']; // keep in sync with CREDITS.md

export function CreditsModal() {
  const open = useUi((u) => u.creditsOpen);
  const setCreditsOpen = useUi((u) => u.setCreditsOpen);
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={() => setCreditsOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Credits</h2>
        <p className="desc">Icons by {AUTHORS.join(', ')} from game-icons.net (CC BY 3.0).</p>
        <p className="desc">
          Your save is stored locally in your browser. Deep Hold collects no personal data.
        </p>
        <button onClick={() => setCreditsOpen(false)}>Close</button>
      </div>
    </div>
  );
}
