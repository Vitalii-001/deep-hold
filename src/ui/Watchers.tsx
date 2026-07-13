import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { useUi } from './uiStore';
import { MILESTONES } from '../config/milestones';

export function Watchers() {
  const milestones = useGame((s) => s.milestonesReached);
  const caveInUntil = useGame((s) => s.caveInUntil);
  const pushToast = useUi((u) => u.pushToast);
  const seenMilestones = useRef<string[] | null>(null);
  const lastCaveIn = useRef(caveInUntil);

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

  return null;
}
