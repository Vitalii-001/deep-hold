import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { useUi } from './uiStore';
import { MILESTONES } from '../config/milestones';
import { isStriking } from '../game/economy';

export function Watchers() {
  const milestones = useGame((s) => s.milestonesReached);
  const caveInUntil = useGame((s) => s.caveInUntil);
  const striking = useGame(isStriking);
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
