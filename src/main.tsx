import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { bootGame } from './game/boot';
import { useUi } from './ui/uiStore';
import './styles.css';

const summary = bootGame();
if (summary && (summary.metersDug >= 0.5 || Object.values(summary.gained).some((v) => v >= 1))) {
  useUi.getState().setOfflineSummary(summary);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);