import type { Cost } from '../game/types';

// Depth Discoveries: one-time story events with a permanent choice.
// Triggered when depth is reached (see game/discoveries.ts); the choice is
// recorded in GameState.discoveryChoices and never offered again.
// All reward numbers live here — tune freely.

export interface DiscoveryOption {
  id: string;
  label: string; // button label
  hint: string; // short reward/consequence line under the label
  gain?: Cost; // resources granted
  cost?: Cost; // resources spent (option disabled if unaffordable)
  modifier?: string; // permanent modifier id granted through config/modifiers
  caveInChance?: number; // 0..1 — chance of triggering a cave-in on choose
  toast: string; // pushed after the choice
}

export interface DiscoveryConfig {
  id: string;
  name: string;
  depth: number; // meters
  text: string;
  options: DiscoveryOption[];
}

export const DISCOVERIES: DiscoveryConfig[] = [
  {
    id: 'buriedCart',
    name: 'Buried Cart',
    depth: 12,
    text: 'The miners uncover an old cart stuck in the dirt. Its wheels are cracked, but the load is intact.',
    options: [
      {
        id: 'salvage',
        label: 'Careful salvage',
        hint: '+25 Stone',
        gain: { stone: 25 },
        toast: '🛒 The cart yields 25 stone, neatly stacked.',
      },
      {
        id: 'smash',
        label: 'Smash it apart',
        hint: '+60 Stone, risk of a cave-in',
        gain: { stone: 60 },
        caveInChance: 0.25,
        toast: '🛒 60 stone! The tunnel groans in disapproval...',
      },
    ],
  },
  {
    id: 'coldSpring',
    name: 'Cold Spring',
    depth: 25,
    text: 'A clean spring runs through the stone. The brewers immediately start arguing about recipes.',
    options: [
      {
        id: 'pipe',
        label: 'Pipe it to the Brewery',
        hint: '+40 Ale',
        gain: { ale: 40 },
        toast: '💧 Fresh spring water — the ale has never tasted better. +40 Ale',
      },
      {
        id: 'barrels',
        label: 'Fill emergency barrels',
        hint: '+40 Ale',
        gain: { ale: 40 },
        toast: '💧 Emergency barrels filled to the brim. +40 Ale',
      },
    ],
  },
  {
    id: 'mushroomNook',
    name: 'Mushroom Nook',
    depth: 50,
    text: 'A soft green glow spills from a cramped side cave. Edible? Probably.',
    options: [
      {
        id: 'harvest',
        label: 'Harvest carefully',
        hint: '+20 Ale',
        gain: { ale: 20 },
        toast: '🍄 A careful harvest. The stew is chunky tonight. +20 Ale',
      },
      {
        id: 'experiment',
        label: 'Let the brewers experiment',
        hint: '+45 Ale',
        gain: { ale: 45 },
        toast: '🍄 Glowing mushroom ale! Nobody asks what the glow is. +45 Ale',
      },
    ],
  },
  {
    id: 'ironShrine',
    name: 'Iron Shrine',
    depth: 75,
    text: 'A hammer-marked shrine is carved into the vein. No dwarf remembers placing it there.',
    options: [
      {
        id: 'offering',
        label: 'Leave an offering',
        hint: '-30 Stone, +5 Ingots, permanent Smelting x1.15',
        cost: { stone: 30 },
        gain: { ingot: 5 },
        modifier: 'ancientKnowledge',
        toast: '🔨 The shrine accepts the offering. Five ingots gleam where stone lay. Smelting knowledge endures.',
      },
      {
        id: 'mineAround',
        label: 'Mine around it',
        hint: '+30 Ore',
        gain: { ore: 30 },
        toast: '🔨 The vein around the shrine is rich. +30 Ore',
      },
    ],
  },
  {
    id: 'clanBanner',
    name: 'Broken Clan Banner',
    depth: 120,
    text: 'A torn banner lies under a fallen beam. Its clan mark is older than your records.',
    options: [
      {
        id: 'hang',
        label: 'Hang it in the Great Hall',
        hint: '+150 Stone, permanent +4% all production',
        gain: { stone: 150 },
        modifier: 'clanHonor',
        toast: '🚩 The banner hangs proud. The dwarves haul stone with new vigor. +150 Stone, Clan Honor earned.',
      },
      {
        id: 'study',
        label: 'Study the stitching',
        hint: '+10 Ingots',
        gain: { ingot: 10 },
        toast: '🚩 The stitching hides old smithing marks — the smiths learn fast. +10 Ingots',
      },
    ],
  },
  {
    id: 'goldenDoor',
    name: 'Golden Door',
    depth: 200,
    text: 'The door has no lock. It opens only a finger-width, just enough to hear singing.',
    options: [
      {
        id: 'seal',
        label: 'Seal it until the Temple is ready',
        hint: '+20 Gold',
        gain: { gold: 20 },
        toast: '🚪 Sealed and marked. Gold flakes from the hinges. +20 Gold',
      },
      {
        id: 'pry',
        label: 'Pry it open',
        hint: '+50 Gold, risk of a cave-in',
        gain: { gold: 50 },
        caveInChance: 0.35,
        toast: '🚪 The singing stops. The gold is real. The silence is not comforting. +50 Gold',
      },
    ],
  },
  {
    id: 'crystalChoir',
    name: 'Crystal Choir',
    depth: 450,
    text: "The gems vibrate in tune with the miners' songs. The brewer says they are singing back.",
    options: [
      {
        id: 'tune',
        label: 'Tune the picks',
        hint: '+500 Stone, +2 Gems',
        gain: { stone: 500, gem: 2 },
        toast: '🎶 The picks ring true. Stone splits along the song. +500 Stone, +2 Gems',
      },
      {
        id: 'cut',
        label: 'Cut the loudest crystal',
        hint: '+6 Gems',
        gain: { gem: 6 },
        toast: '🎶 The choir falls quiet. Six flawless gems. Something noticed.',
      },
    ],
  },
  {
    id: 'sealedGate',
    name: 'Sealed Gate',
    depth: 1000,
    text: 'The ancient gate is warm. Something behind it breathes once every minute. The Deep Hold has reached the edge of the known mountain.',
    options: [
      {
        id: 'mark',
        label: 'Mark it and retreat',
        hint: '+10 Gems, final v1 trophy',
        gain: { gem: 10 },
        toast: '⛩️ Sealed Gate marked. The mountain sleeps... for now. +10 Gems',
      },
      {
        id: 'openSeal',
        label: 'Open the first seal',
        hint: '+300 Gold, final v1 trophy',
        gain: { gold: 300 },
        toast: '⛩️ The first seal opens. Gold spills out, then the mountain falls silent... for now.',
      },
    ],
  },
];

// Strange discoveries (Phase 1, §6.2): triggered by brewing Glowbrew, not by
// depth (depth: Infinity keeps them out of the depth queue). A deliberately
// tiny starter pool — grows in later phases.
export const STRANGE_DISCOVERIES: DiscoveryConfig[] = [
  {
    id: 'singingMold',
    name: 'Singing Mold',
    depth: Infinity,
    text: 'The glowbrew vat hums a low tune. The brewers swear the mold is harmonizing.',
    options: [
      {
        id: 'bottle',
        label: 'Bottle it',
        hint: '+30 Ale',
        gain: { ale: 30 },
        toast: '🍄 The humming ale sells itself. +30 Ale',
      },
      {
        id: 'scrape',
        label: 'Scrape it into the vein',
        hint: '+1 Gem',
        gain: { gem: 1 },
        toast: '🍄 The mold crystallizes into something... pretty? +1 Gem',
      },
    ],
  },
  {
    id: 'blueVisions',
    name: 'Blue Visions',
    depth: Infinity,
    text: 'Miners report glowing veins that are not there. Probably not there.',
    options: [
      {
        id: 'follow',
        label: 'Follow the visions',
        hint: '+15 Ore',
        gain: { ore: 15 },
        toast: '👁️ The visions led somewhere real. +15 Ore',
      },
      {
        id: 'sleep',
        label: 'Order everyone to sleep it off',
        hint: '+20 Ale',
        gain: { ale: 20 },
        toast: '👁️ A good nap and a round on the King. +20 Ale',
      },
    ],
  },
];

export const DISCOVERY_MAP: Record<string, DiscoveryConfig> = Object.fromEntries(
  [...DISCOVERIES, ...STRANGE_DISCOVERIES].map((d) => [d.id, d]),
);
