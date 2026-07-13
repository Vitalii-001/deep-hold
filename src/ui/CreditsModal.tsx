import { useState } from 'react';

const AUTHORS = ['Lorc', 'Delapouite', 'Faithtoken']; // keep in sync with CREDITS.md

export function CreditsModal() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className="credits-link" onClick={() => setOpen(true)}>
        Credits
      </button>
    );
  }
  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Credits</h2>
        <p className="desc">
          Icons by {AUTHORS.join(', ')} from game-icons.net (CC BY 3.0).
        </p>
        <button onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>
  );
}
