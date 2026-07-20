import type { StatId } from '../game/types';

// Collectible finds (NEW_FEATURES.md §1). Unlike rock chunks (which pay
// resources), a find is a keepsake shown in the King's Hall Collection tab.
// Completing every find of a layer grants a small permanent set bonus.
// All content lives here — tune freely. Visuals are derived from
// category + rarity by ui/mine/FindIcon.tsx (no per-item art needed yet).

export type FindCategory = 'fossil' | 'relic' | 'crystal' | 'tool';
export type FindRarity = 'common' | 'rare' | 'legendary';

export interface FindConfig {
  id: string;
  name: string;
  layerId: string; // layers.ts id this find belongs to / drops in
  category: FindCategory;
  rarity: FindRarity; // drives drop weighting and card framing
  description: string;
  flavor: string;
}

// Permanent bonus granted when EVERY find of a layer is collected. Reuses the
// same fields as artifacts so economy.ts aggregates it the same way.
export interface LayerSetBonusConfig {
  layerId: string;
  name: string;
  description: string;
  stat?: StatId;
  statMult?: number;
  aleStorageMult?: number;
  surveySpeedMult?: number;
}

export const FINDS: FindConfig[] = [
  // — Topsoil / Stone: one gentle common each, to teach the mechanic —
  {
    id: 'rustyBuckle',
    name: 'Rusty Belt Buckle',
    layerId: 'dirt',
    category: 'tool',
    rarity: 'common',
    description: 'A worn buckle from some long-forgotten digger.',
    flavor: 'Somebody lost their trousers down here. Best not to ask.',
  },
  {
    id: 'trilobiteFossil',
    name: 'Trilobite Fossil',
    layerId: 'stone',
    category: 'fossil',
    rarity: 'common',
    description: 'A little armored bug, turned to stone an age ago.',
    flavor: 'The scouts named it Barold. Barold is a good bug.',
  },

  // — Mushroom Grotto —
  {
    id: 'sporecapFossil',
    name: 'Sporecap Fossil',
    layerId: 'mushroom',
    category: 'fossil',
    rarity: 'common',
    description: 'A fossilized mushroom cap, still faintly ridged.',
    flavor: 'It does not glow anymore. The brewers are disappointed.',
  },
  {
    id: 'glowcapAmber',
    name: 'Glowcap Amber',
    layerId: 'mushroom',
    category: 'crystal',
    rarity: 'rare',
    description: 'A drop of amber with a glowing spore trapped inside.',
    flavor: 'It hums when the ale is good.',
  },

  // — Iron Veins (set: +5% Smelting) —
  {
    id: 'ironTrilobite',
    name: 'Iron-Cast Trilobite',
    layerId: 'iron',
    category: 'fossil',
    rarity: 'common',
    description: 'A trilobite whose shell replaced itself with pure iron.',
    flavor: 'Nature did the smelting for you. Rude.',
  },
  {
    id: 'oldPickhead',
    name: 'Old Pickhead',
    layerId: 'iron',
    category: 'tool',
    rarity: 'common',
    description: 'The head of a pick, snapped clean off its haft.',
    flavor: 'Whoever swung this hit something they should not have.',
  },
  {
    id: 'ferrousGeode',
    name: 'Ferrous Geode',
    layerId: 'iron',
    category: 'crystal',
    rarity: 'rare',
    description: 'A geode lined with needle-sharp iron crystals.',
    flavor: 'The smiths keep it on a high shelf, away from fingers.',
  },

  // — Coal Seams (set: +5% Mining) —
  {
    id: 'fernImprint',
    name: 'Fern Imprint',
    layerId: 'coal',
    category: 'fossil',
    rarity: 'common',
    description: 'A perfect fern pressed into a slab of coal.',
    flavor: 'A forest lived here once. Now it heats the forges.',
  },
  {
    id: 'minersLamp',
    name: "Miner's Old Lamp",
    layerId: 'coal',
    category: 'tool',
    rarity: 'common',
    description: 'A dented oil lamp, its glass long since gone.',
    flavor: 'Still smells faintly of the last shift.',
  },
  {
    id: 'coalDiamond',
    name: 'Coal Diamond',
    layerId: 'coal',
    category: 'crystal',
    rarity: 'rare',
    description: 'Pressure turned this lump of coal halfway to diamond.',
    flavor: 'Halfway. Just enough to be smug about it.',
  },

  // — Gold Seams (set: +5% Dig speed) —
  {
    id: 'goldenScarab',
    name: 'Golden Scarab',
    layerId: 'gold',
    category: 'relic',
    rarity: 'common',
    description: 'A beetle cast in gold by some patient hand.',
    flavor: 'It watches you back. You decide not to think about it.',
  },
  {
    id: 'lostSignet',
    name: 'Lost Signet Ring',
    layerId: 'gold',
    category: 'relic',
    rarity: 'rare',
    description: 'A heavy signet ring stamped with an unknown crest.',
    flavor: 'The crest matches no clan in the ledger. Yet.',
  },
  {
    id: 'sunstoneCluster',
    name: 'Sunstone Cluster',
    layerId: 'gold',
    category: 'crystal',
    rarity: 'legendary',
    description: 'A cluster of stones that hold the warmth of daylight.',
    flavor: 'The dwarves gather around it like a hearth.',
  },

  // — Flooded Caverns —
  {
    id: 'drownedCompass',
    name: 'Drowned Compass',
    layerId: 'flooded',
    category: 'tool',
    rarity: 'common',
    description: 'A brass compass, its needle spinning uselessly.',
    flavor: 'Down here every direction is the wrong one.',
  },
  {
    id: 'pearlNautilus',
    name: 'Pearl Nautilus',
    layerId: 'flooded',
    category: 'fossil',
    rarity: 'rare',
    description: 'A spiral shell turned entirely to pearl.',
    flavor: 'It fits perfectly in a cupped hand.',
  },

  // — Gem Hollows (set: +10% Survey speed) —
  {
    id: 'amethystDruse',
    name: 'Amethyst Druse',
    layerId: 'gems',
    category: 'crystal',
    rarity: 'common',
    description: 'A crust of small purple crystals on grey rock.',
    flavor: 'Common down here. Priceless up there.',
  },
  {
    id: 'singingShard',
    name: 'Singing Shard',
    layerId: 'gems',
    category: 'crystal',
    rarity: 'rare',
    description: 'A shard that rings when the tunnels go quiet.',
    flavor: 'It answers the Crystal Choir, note for note.',
  },
  {
    id: 'heartOfHollow',
    name: 'Heart of the Hollow',
    layerId: 'gems',
    category: 'crystal',
    rarity: 'legendary',
    description: 'A gem the size of a fist, warm and slowly pulsing.',
    flavor: 'It beats. You have decided not to mention this to anyone.',
  },

  // — Obsidian Belt —
  {
    id: 'obsidianBlade',
    name: 'Obsidian Blade',
    layerId: 'obsidian',
    category: 'tool',
    rarity: 'common',
    description: 'A blade of black glass, still wickedly sharp.',
    flavor: 'Older than any forge. Sharper than most.',
  },
  {
    id: 'volcanicTear',
    name: 'Volcanic Tear',
    layerId: 'obsidian',
    category: 'crystal',
    rarity: 'rare',
    description: 'A teardrop of glass frozen mid-fall.',
    flavor: 'The mountain wept once. This is what was left.',
  },

  // — Ancient Ruins —
  {
    id: 'ancestorRune',
    name: 'Ancestor Rune',
    layerId: 'ruins',
    category: 'relic',
    rarity: 'rare',
    description: 'A carved rune that no living dwarf can read.',
    flavor: 'The oldest scout felt he almost could. Almost.',
  },
  {
    id: 'crownFragment',
    name: 'Crown Fragment',
    layerId: 'ruins',
    category: 'relic',
    rarity: 'legendary',
    description: 'A shard of a crown from a hold older than the King.',
    flavor: 'You do not show this one to the King. Not yet.',
  },
];

export const LAYER_SET_BONUSES: LayerSetBonusConfig[] = [
  { layerId: 'iron', name: 'Iron Cache', description: '+5% Smelting', stat: 'smelt', statMult: 1.05 },
  { layerId: 'coal', name: 'Coal Cache', description: '+5% Mining', stat: 'mining', statMult: 1.05 },
  { layerId: 'gold', name: 'Gold Cache', description: '+5% Dig speed', stat: 'dig', statMult: 1.05 },
  { layerId: 'gems', name: 'Gem Cache', description: '+10% Survey speed', surveySpeedMult: 1.1 },
];

export const FIND_MAP: Record<string, FindConfig> = Object.fromEntries(FINDS.map((f) => [f.id, f]));
