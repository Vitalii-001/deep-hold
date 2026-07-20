import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bootGame } from './game/boot';
import { clearSave } from './game/save';
import { useUi } from './ui/uiStore';
import { gameplayStart, initPortal } from './sdk/portal';
import './styles.css';

// ?reset wipes the save before boot. Runs after any beforeunload re-save of
// the previous page, so it always wins; the param is then dropped from the
// URL so a plain reload doesn't wipe again.
if (new URLSearchParams(window.location.search).has('reset')) {
  clearSave();
  window.history.replaceState(null, '', window.location.pathname);
}

const root = document.getElementById('root')!;

if (!initPortal()) {
  // Sitelock rejected the host — static note, no game.
  root.innerHTML =
    '<p style="font-family:system-ui;padding:40px;text-align:center">Play <strong>Deep Hold</strong> on CrazyGames.</p>';
} else {
  const summary = bootGame();
  if (summary && (summary.metersDug >= 0.5 || Object.values(summary.gained).some((v) => v >= 1))) {
    useUi.getState().setOfflineSummary(summary);
  }
  // Portal metric: initial download is measured up to the first gameplayStart.
  // The game is interactive immediately after boot (≤1 click to gameplay).
  gameplayStart();

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}