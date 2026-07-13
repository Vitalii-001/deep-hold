import { BALANCE } from '../config/balance';
import { clearSave, loadGame } from './save';
import { simulateOffline, type OfflineSummary } from './offline';
import { initialState, useGame } from './store';

// Wipes the save AND the in-memory state. Both are required: the loop's
// autosave/beforeunload handlers re-persist whatever is in memory, so
// clearing storage alone never sticks.
export function resetGame(): void {
  clearSave();
  useGame.getState().hydrate(initialState());
}

export function bootGame(now: number = Date.now()): OfflineSummary | null {
  const saved = loadGame();
  if (!saved) return null;
  const elapsedSec = (now - saved.savedAt) / 1000;
  if (elapsedSec >= BALANCE.offline.minModalSec) {
    const { state, summary } = simulateOffline(saved.state, elapsedSec, now);
    useGame.getState().hydrate(state);
    return summary;
  }
  useGame.getState().hydrate(saved.state);
  return null;
}
