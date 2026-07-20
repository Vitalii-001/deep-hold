// Mining methods (Phase 2, §6.1): the old careful/reckless dig mode is folded
// in here — Bulk carries the cave-in risk. "Value over volume": Selective
// trades stone and descent speed for richer secondary yields; Bulk trades
// safety and ale for speed and stone.
export type MiningMethodId = 'balanced' | 'selective' | 'bulk';

export interface MiningMethodConfig {
  id: MiningMethodId;
  name: string;
  description: string;
  stoneMult: number; // multiplier on stone mined
  secondaryMult: number; // multiplier on the layer's secondary yields (ore/gold/gem)
  digMult: number; // descent speed multiplier
  aleMult: number; // ale consumption multiplier
  caveInMult: number; // cave-in risk multiplier (0 = safe)
}

export const MINING_METHODS: Record<MiningMethodId, MiningMethodConfig> = {
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    description: 'Steady digging. Nothing wasted, nothing risked.',
    stoneMult: 1,
    secondaryMult: 1,
    digMult: 1,
    aleMult: 1,
    caveInMult: 0,
  },
  selective: {
    id: 'selective',
    name: 'Selective',
    description: 'Follow the veins: more ore and gold, slower descent, less stone.',
    stoneMult: 0.65,
    secondaryMult: 1.8,
    digMult: 0.75,
    aleMult: 1.1,
    caveInMult: 0,
  },
  bulk: {
    id: 'bulk',
    name: 'Bulk',
    description: 'Blast through: fast descent and heaps of stone — thirsty work, and the tunnels groan.',
    stoneMult: 1.5,
    secondaryMult: 0.6,
    digMult: 1.5,
    aleMult: 1.35,
    caveInMult: 1,
  },
};

export const MINING_METHOD_LIST: MiningMethodConfig[] = Object.values(MINING_METHODS);
