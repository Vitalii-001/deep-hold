import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bootGame } from './game/boot';
import { clearSave } from './game/save';
import { useUi } from './ui/uiStore';
import './styles.css';

// ?reset wipes the save before boot. Runs after any beforeunload re-save of
// the previous page, so it always wins; the param is then dropped from the
// URL so a plain reload doesn't wipe again.
if (new URLSearchParams(window.location.search).has('reset')) {
  clearSave();
  window.history.replaceState(null, '', window.location.pathname);
}

const summary = bootGame();
if (summary && (summary.metersDug >= 0.5 || Object.values(summary.gained).some((v) => v >= 1))) {
  useUi.getState().setOfflineSummary(summary);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);