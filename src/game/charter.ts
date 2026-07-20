import type { Cost, GameState, ResourceId } from './types';
import { CHARTER, type CharterChapter, type CharterGoal } from '../config/charter';
import { aleStorage } from './economy';

export interface CharterGoalStatus {
  chapter: CharterChapter;
  goal: CharterGoal;
  done: boolean;
  current: number;
  target: number;
}

export interface CharterProgress {
  chapters: { chapter: CharterChapter; goals: CharterGoalStatus[]; complete: boolean }[];
  current: CharterGoalStatus | null; // first incomplete goal
  next: CharterGoalStatus | null; // the goal after it
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
}

export function isGoalComplete(s: GameState, goal: CharterGoal): boolean {
  const { current, target } = goal.progress(s);
  return current >= target;
}

// Goals complete strictly in Charter order: the current goal is the first one
// whose id is not yet in charterGoalsDone.
export function getCurrentGoal(
  s: GameState,
): { chapter: CharterChapter; goal: CharterGoal } | null {
  for (const chapter of CHARTER) {
    for (const goal of chapter.goals) {
      if (!s.charterGoalsDone.includes(goal.id)) return { chapter, goal };
    }
  }
  return null;
}

export function getCompletedGoals(s: GameState): CharterGoal[] {
  return CHARTER.flatMap((ch) => ch.goals).filter((g) => s.charterGoalsDone.includes(g.id));
}

export function getCharterProgress(s: GameState): CharterProgress {
  const pending: CharterGoalStatus[] = [];
  let completedCount = 0;
  let totalCount = 0;

  const chapters = CHARTER.map((chapter) => {
    const goals = chapter.goals.map((goal) => {
      const done = s.charterGoalsDone.includes(goal.id);
      const { current, target } = goal.progress(s);
      const status: CharterGoalStatus = { chapter, goal, done, current, target };
      totalCount++;
      if (done) completedCount++;
      else pending.push(status);
      return status;
    });
    return { chapter, goals, complete: goals.every((g) => g.done) };
  });

  return {
    chapters,
    current: pending[0] ?? null,
    next: pending[1] ?? null,
    completedCount,
    totalCount,
    allComplete: pending.length === 0,
  };
}

function grant(s: GameState, res: Record<ResourceId, number>, reward: Cost): Record<ResourceId, number> {
  const out = { ...res };
  for (const [k, v] of Object.entries(reward)) {
    const id = k as ResourceId;
    out[id] += v as number;
  }
  if (reward.ale) {
    // ale grants respect storage (like brewing) but never take ale away
    out.ale = Math.max(res.ale, Math.min(aleStorage(s), out.ale));
  }
  return out;
}

// Completes every consecutively-satisfied goal (an old save deep underground
// may clear several at once) and grants goal/chapter rewards. Pure — called
// from simulateTick, so it also runs during offline simulation.
export function applyCharterCompletions(s: GameState): GameState {
  let out = s;
  for (;;) {
    const cur = getCurrentGoal(out);
    if (!cur || !isGoalComplete(out, cur.goal)) return out;
    let resources = out.resources;
    if (cur.goal.reward) resources = grant(out, resources, cur.goal.reward);
    const charterGoalsDone = [...out.charterGoalsDone, cur.goal.id];
    const chapterDone = cur.chapter.goals.every((g) => charterGoalsDone.includes(g.id));
    if (chapterDone && cur.chapter.reward) {
      resources = grant(out, resources, cur.chapter.reward);
    }
    out = { ...out, resources, charterGoalsDone };
  }
}
