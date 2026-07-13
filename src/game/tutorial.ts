import type { GameState } from './types';
import { TUTORIAL_STEPS, type TutorialStepConfig } from '../config/tutorial';

export interface TutorialEvaluation {
  toComplete: string[]; // step ids to mark done this pass
  active: TutorialStepConfig | null; // the single hint to show, or null
}

export function evaluateTutorial(s: GameState, shownId: string | null): TutorialEvaluation {
  const done = new Set(s.tutorialDone);
  const toComplete: string[] = [];

  for (const step of TUTORIAL_STEPS) {
    if (done.has(step.id)) continue;
    // requiresShown steps (the strike hint) only auto-complete while they are the
    // one being shown — otherwise "not striking" would complete it at game start,
    // before it ever appears.
    const mayComplete = !step.requiresShown || shownId === step.id;
    if (mayComplete && step.doneWhen(s)) {
      toComplete.push(step.id);
      done.add(step.id);
    }
  }

  let active: TutorialStepConfig | null = null;
  for (const step of TUTORIAL_STEPS) {
    if (done.has(step.id)) continue; // skips steps just auto-completed above
    if (step.showWhen(s)) {
      active = step;
      break;
    }
  }

  return { toComplete, active };
}
