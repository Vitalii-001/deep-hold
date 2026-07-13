import { BALANCE } from '../config/balance';
import { loadGame } from './save';
import { simulateOffline, type OfflineSummary } from './offline';
import { useGame } from './store';

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
