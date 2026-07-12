import { useEffect } from 'react';
import { BALANCE } from '../config/balance';
import { saveGame } from './save';
import { simulateOffline } from './offline';
import { useGame } from './store';

export function useGameLoop(): void {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let saveAcc = 0;
    let hiddenAt = 0;

    const frame = (t: number) => {
      const dt = Math.min((t - last) / 1000, 5);
      last = t;
      acc += dt;
      if (acc >= 0.1) {
        useGame.getState().tick(acc, Date.now());
        saveAcc += acc;
        acc = 0;
      }
      if (saveAcc >= BALANCE.autosaveSec) {
        saveGame(useGame.getState());
        saveAcc = 0;
      }
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        saveGame(useGame.getState());
      } else {
        last = performance.now(); // don't count hidden time as a live dt
        const gapSec = hiddenAt ? (Date.now() - hiddenAt) / 1000 : 0;
        if (gapSec > 60) {
          const { state } = simulateOffline(useGame.getState(), gapSec, Date.now());
          useGame.getState().hydrate(state);
        }
        hiddenAt = 0;
      }
    };
    const onUnload = () => saveGame(useGame.getState());

    raf = requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);
}