export type ResourceId = 'stone' | 'ore' | 'ingot' | 'gold' | 'gem' | 'ale';
export type WorkerId = 'miner' | 'smith' | 'brewer' | 'scout';
export type BuildingId = 'mineShaft' | 'smelter' | 'forge' | 'brewery' | 'greatHall' | 'temple';
export type StatId = 'mining' | 'click' | 'smelt' | 'brew' | 'aleThrift' | 'dig' | 'offline';
export type DigMode = 'careful' | 'reckless';

export type Cost = Partial<Record<ResourceId, number>>;

export interface GameState {
  resources: Record<ResourceId, number>;
  workers: Record<WorkerId, number>;
  buildings: Record<BuildingId, number>; // levels
  upgrades: string[]; // purchased upgrade ids
  depth: number; // meters
  milestonesReached: string[];
  digMode: DigMode;
  caveInUntil: number; // epoch ms; production stunned while > now
  blessingUntil: number; // epoch ms; x2 production while > now
  muted: boolean;
  tutorialDone: string[]; // completed tutorial step ids
}
