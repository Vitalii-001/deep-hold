import { useEffect, useRef } from 'react';
import { useGame } from '../game/store';
import { useUi } from './uiStore';
import { MILESTONES } from '../config/milestones';
import { findCharterGoal } from '../config/charter';
import { WORKERS } from '../config/workers';
import { BUILDINGS } from '../config/buildings';
import { UPGRADES } from '../config/upgrades';
import { SURVEY_BONUSES } from '../config/survey';
import { MODIFIERS } from '../config/modifiers';
import { ORDER_MAP } from '../config/orders';
import { isStriking } from '../game/economy';
import type { BuildingId, WorkerId } from '../game/types';

export function Watchers() {
  const milestones = useGame((s) => s.milestonesReached);
  const charterDone = useGame((s) => s.charterGoalsDone);
  const workers = useGame((s) => s.workers);
  const buildings = useGame((s) => s.buildings);
  const upgrades = useGame((s) => s.upgrades);
  const surveyBonuses = useGame((s) => s.surveyBonuses);
  const permanentBonuses = useGame((s) => s.permanentBonuses);
  const ordersCompleted = useGame((s) => s.ordersCompleted);
  const caveInUntil = useGame((s) => s.caveInUntil);
  const striking = useGame(isStriking);
  const pushToast = useUi((u) => u.pushToast);
  const seenMilestones = useRef<string[] | null>(null);
  const seenCharter = useRef<string[] | null>(null);
  const prevWorkers = useRef<Record<WorkerId, number> | null>(null);
  const prevBuildings = useRef<Record<BuildingId, number> | null>(null);
  const seenUpgrades = useRef<string[] | null>(null);
  const seenSurveys = useRef<string[] | null>(null);
  const seenModifiers = useRef<string[] | null>(null);
  const seenOrderCount = useRef<number | null>(null);
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
        if (m) pushToast(`⛏️ ${m.text} — +${Math.round((m.mult - 1) * 100)}% production`);
      }
    }
    seenMilestones.current = milestones;
  }, [milestones, pushToast]);

  useEffect(() => {
    if (seenCharter.current === null) {
      seenCharter.current = charterDone; // loaded from save — don't re-toast
      return;
    }
    for (const id of charterDone) {
      if (!seenCharter.current.includes(id)) {
        const found = findCharterGoal(id);
        if (!found) continue;
        pushToast(`📜 Charter goal complete: ${found.goal.text}`);
        if (found.chapter.goals.every((g) => charterDone.includes(g.id))) {
          pushToast(`👑 ${found.chapter.title} — complete!`);
        }
      }
    }
    seenCharter.current = charterDone;
  }, [charterDone, pushToast]);

  // Worker hires, building builds/upgrades and upgrade purchases all mutate state
  // only on success, so diffing the previous snapshot toasts exactly once per
  // real change — regardless of which panel or goal-card triggered it. First
  // render seeds the refs so a loaded save never re-toasts.
  useEffect(() => {
    if (prevWorkers.current === null) {
      prevWorkers.current = workers;
      return;
    }
    for (const id of Object.keys(workers) as WorkerId[]) {
      if (workers[id] > prevWorkers.current[id]) pushToast(`🧔 Hired a ${WORKERS[id].name}`);
    }
    prevWorkers.current = workers;
  }, [workers, pushToast]);

  useEffect(() => {
    if (prevBuildings.current === null) {
      prevBuildings.current = buildings;
      return;
    }
    for (const id of Object.keys(buildings) as BuildingId[]) {
      const level = buildings[id];
      if (level > prevBuildings.current[id]) {
        pushToast(level === 1 ? `🏗️ ${BUILDINGS[id].name} built!` : `🏗️ ${BUILDINGS[id].name} → Lv ${level}`);
      }
    }
    prevBuildings.current = buildings;
  }, [buildings, pushToast]);

  useEffect(() => {
    if (seenUpgrades.current === null) {
      seenUpgrades.current = upgrades;
      return;
    }
    for (const id of upgrades) {
      if (!seenUpgrades.current.includes(id) && UPGRADES[id]) pushToast(`⭐ ${UPGRADES[id].name}`);
    }
    seenUpgrades.current = upgrades;
  }, [upgrades, pushToast]);

  useEffect(() => {
    const keys = Object.keys(surveyBonuses);
    if (seenSurveys.current === null) {
      seenSurveys.current = keys; // loaded from save — don't re-toast
      return;
    }
    for (const layerId of keys) {
      if (!seenSurveys.current.includes(layerId)) {
        const bonus = SURVEY_BONUSES.find((b) => b.id === surveyBonuses[layerId]);
        if (bonus) pushToast(bonus.toast);
      }
    }
    seenSurveys.current = keys;
  }, [surveyBonuses, pushToast]);

  useEffect(() => {
    if (seenModifiers.current === null) {
      seenModifiers.current = permanentBonuses;
      return;
    }
    for (const id of permanentBonuses) {
      if (!seenModifiers.current.includes(id)) {
        const mod = MODIFIERS[id];
        if (mod) pushToast(`🏛️ Permanent boon: ${mod.name} — ${mod.description}`);
      }
    }
    seenModifiers.current = permanentBonuses;
  }, [permanentBonuses, pushToast]);

  useEffect(() => {
    if (seenOrderCount.current === null) {
      seenOrderCount.current = ordersCompleted.length;
      return;
    }
    if (ordersCompleted.length > seenOrderCount.current) {
      const id = ordersCompleted[ordersCompleted.length - 1];
      pushToast(`📜 Royal Order complete: ${ORDER_MAP[id]?.title ?? id}`);
    }
    seenOrderCount.current = ordersCompleted.length;
  }, [ordersCompleted, pushToast]);

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
