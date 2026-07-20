import type { GameState, ResourceId } from './types';
import { BALANCE } from '../config/balance';
import {
  DISCOVERIES,
  STRANGE_DISCOVERIES,
  type DiscoveryConfig,
  type DiscoveryOption,
} from '../config/discoveries';
import { MODIFIERS } from '../config/modifiers';
import { aleStorage, canAfford, payCost } from './economy';

// The next discovery that should pop up: shallowest unseen one at or above
// the current depth. Returns null while another discovery is awaiting a choice
// — only one modal at a time; the next queues up on a later tick.
export function getNextPendingDiscovery(s: GameState): DiscoveryConfig | null {
  if (s.pendingDiscoveryId) return null;
  return DISCOVERIES.find((d) => s.depth >= d.depth && !s.discoveriesSeen.includes(d.id)) ?? null;
}

// Glowbrew-only pool: first unseen strange event, if any (Phase 1, §6.2).
export function getNextStrangeDiscovery(s: GameState): DiscoveryConfig | null {
  if (s.pendingDiscoveryId) return null;
  return STRANGE_DISCOVERIES.find((d) => !s.discoveriesSeen.includes(d.id)) ?? null;
}

// Applies a discovery choice: pays the cost, grants the reward, rolls the
// cave-in risk, records the choice, clears the pending id. Pure; returns the
// input state unchanged if the choice is invalid or unaffordable.
export function applyDiscoveryChoice(
  s: GameState,
  discovery: DiscoveryConfig,
  option: DiscoveryOption,
  now: number,
  rng: () => number = Math.random,
): GameState {
  if (s.pendingDiscoveryId !== discovery.id) return s;
  if (s.discoveriesSeen.includes(discovery.id)) return s;
  if (option.cost && !canAfford(s.resources, option.cost)) return s;

  let resources = option.cost ? payCost(s.resources, option.cost) : { ...s.resources };
  if (option.gain) {
    for (const [k, v] of Object.entries(option.gain)) {
      resources[k as ResourceId] += v as number;
    }
    if (option.gain.ale) {
      // ale grants respect storage (like brewing) but never take ale away
      resources.ale = Math.max(s.resources.ale, Math.min(aleStorage(s), resources.ale));
    }
  }

  let caveInUntil = s.caveInUntil;
  if (option.caveInChance && rng() < option.caveInChance) {
    caveInUntil = now + BALANCE.dig.caveIn.stunSec * 1000;
  }
  let permanentBonuses = s.permanentBonuses;
  if (option.modifier && MODIFIERS[option.modifier] && !permanentBonuses.includes(option.modifier)) {
    permanentBonuses = [...permanentBonuses, option.modifier];
  }

  return {
    ...s,
    resources,
    caveInUntil,
    permanentBonuses,
    discoveriesSeen: [...s.discoveriesSeen, discovery.id],
    discoveryChoices: { ...s.discoveryChoices, [discovery.id]: option.id },
    pendingDiscoveryId: null,
  };
}
