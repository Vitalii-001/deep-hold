import type { BrewModeId } from '../config/brewModes';
import type { MiningMethodId } from '../config/miningMethods';
import type { SurveyBonusId } from '../config/survey';

export type ResourceId = 'stone' | 'ore' | 'ingot' | 'gold' | 'gem' | 'ale';
export type WorkerId = 'miner' | 'smith' | 'brewer' | 'scout';
export type BuildingId = 'mineShaft' | 'smelter' | 'forge' | 'brewery' | 'greatHall' | 'temple' | 'tradingPost';
export type StatId = 'mining' | 'smelt' | 'brew' | 'aleThrift' | 'dig' | 'offline';

export type Cost = Partial<Record<ResourceId, number>>;

export type AwardType = 'trophy' | 'artifact' | 'record' | 'find';

export interface NewAward {
  type: AwardType;
  id: string;
}

export interface GameRecords {
  totalAleBrewed: number;
  totalAleConsumed: number;
  longestMerryShiftSec: number;
  currentMerryShiftSec: number;
  totalOreMined: number;
  totalGoldMined: number;
  totalIngotsSmelted: number;
  caveInsSurvived: number;
  bestOfflineYield: Partial<Record<ResourceId, number>>;
  feastsHeld: number;
  strikesRecovered: number;
  selectiveSec: number;
  bulkSec: number;
  surveysCompleted: number;
  totalFindsCollected: number;
}

export interface ActiveOrder {
  templateId: string;
  remainingSec: number; // game-time
}

export interface Expedition {
  templateId: string;
  remainingSec: number; // return timer; progresses live and while offline
  targetLayerId?: string; // scout reports lock onto the layer that was selected at start
}

export type CartPhase = 'loading' | 'up' | 'unloading' | 'down';

// Haul-cycle cart (spec 2026-07-19-cart-courier-design.md). Timers are stored
// as REMAINING seconds, not deadlines — playedSec is restored after offline
// simulation, so absolute game-time deadlines would drift into the future.
export interface CartState {
  phase: CartPhase;
  phaseLeftSec: number; // time left in the phase; `loading` with 0 = idle, waiting for ore
  tripDepth: number; // depth (m) frozen at departure — travel distance for up/down
  load: Cost | null; // on-board resources while up/unloading
  lastDelivery: Cost | null; // most recent delivered batch (fresh object per delivery; UI feedback)
}

export interface GameState {
  resources: Record<ResourceId, number>;
  cartBuffer: Cost; // mined-but-undelivered output waiting at the dig face
  cart: CartState;
  workers: Record<WorkerId, number>;
  buildings: Record<BuildingId, number>; // levels
  upgrades: string[]; // purchased upgrade ids
  depth: number; // meters
  milestonesReached: string[];
  miningMethod: MiningMethodId; // balanced/selective/bulk (Phase 2 — absorbed the old digMode)
  surveyProgress: Record<string, number>; // layerId -> 0..100 scout survey progress
  surveyBonuses: Partial<Record<string, SurveyBonusId>>; // layerId -> rolled permanent bonus
  caveInUntil: number; // epoch ms; production stunned while > now
  blessingUntil: number; // epoch ms; x2 production while > now
  muted: boolean;
  playedSec: number; // game-time clock: accumulates only while simulating live play (offline excluded)
  brewMode: BrewModeId; // active ale recipe (Phase 1)
  feastUntilSec: number; // playedSec until which the feast bonus lasts
  feastCooldownUntilSec: number; // playedSec when the next feast becomes available
  rallyReadyAtSec: number; // playedSec when Rally Miners is off cooldown
  tutorialDone: string[]; // completed tutorial step ids
  onboarding: { introSeen: boolean }; // first-run intro state
  charterGoalsDone: string[]; // completed Royal Charter goal ids (rewards already granted)
  discoveriesSeen: string[]; // resolved discovery ids (choice made)
  discoveryChoices: Record<string, string>; // discovery id -> chosen option id
  pendingDiscoveryId: string | null; // discovery awaiting a player choice
  permanentBonuses: string[]; // owned modifier ids (orders/discoveries/artifacts)
  activeOrders: ActiveOrder[]; // Royal Orders currently on the board (Phase 3)
  ordersCompleted: string[]; // capped history of completed Royal Orders
  expeditions: Expedition[]; // scout expeditions / fermenting batches (Phase 3 return timers)
  trophiesEarned: string[]; // King's Hall trophies earned after Phase 4 migration
  artifactsFound: string[]; // discovered artifacts available for display
  displayedArtifacts: string[]; // max 3, only these grant bonuses
  findsCollected: string[]; // collectible finds dug up (Collection tab; full layer set = bonus)
  crowns: number; // Trading Post currency (§3) — earned by selling surplus, never a ResourceId
  marketPerks: string[]; // purchased Market perk ids (§3); their modifier effect also lands in permanentBonuses
  newAwards: NewAward[]; // capped unread award badges for King's Hall
  records: GameRecords; // accumulated counters for Hall records and award conditions
}
