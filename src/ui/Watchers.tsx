import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { useUi } from './uiStore';
import { MILESTONES } from '../config/milestones';
import { BALANCE } from '../config/balance';
import { statMult } from '../game/economy';

export function Watchers() {
  const milestones = useGame((s) => s.milestonesReached);
  const caveInUntil = useGame((s) => s.caveInUntil);
  // Mirrors AleStatus's strike condition: ale can't cover one ~0.1s tick of thirst.
  const striking = useGame((s) => {
    const totalWorkers = s.workers.miner + s.workers.smith + s.workers.brewer + s.workers.scout;
    if (totalWorkers === 0) return false;
    const drink = (totalWorkers * BALANCE.ale.consumptionPerWorker) / statMult(s, 'aleThrift', Date.now());
    return s.resources.ale < drink * 0.1;
  });
  const pushToast = useUi((u) => u.pushToast);
  const seenMilestones = useRef<string[] | null>(null);
  const lastCaveIn = useRef(caveInUntil);
  const wasStriking = useRef(striking);

  useEffect(() => {
    if (seenMilestones.current === null) {
      seenMilestones.current = milestones; // loaded from save — don't re-toast
      return;
    }
    for (const id of milestones) {
      if (!seenMilestones.current.includes(id)) {
        const m = MILESTONES.find((x) => x.id === id);
        if (m) pushToast(`⛏️ ${m.text}`);
      }
    }
    seenMilestones.current = milestones;
  }, [milestones, pushToast]);

  useEffect(() => {
    if (caveInUntil > lastCaveIn.current) {
      pushToast('💥 CAVE-IN! The dwarves are digging themselves out...');
    }
    lastCaveIn.current = caveInUntil;
  }, [caveInUntil, pushToast]);

  useEffect(() => {
    if (striking && !wasStriking.current) {
      pushToast('🪧 The ale ran dry — the dwarves are ON STRIKE! Brew more ale.');
    } else if (!striking && wasStriking.current) {
      pushToast('🍺 The ale flows again — back to work!');
    }
    wasStriking.current = striking;
  }, [striking, pushToast]);

  return null;
}
