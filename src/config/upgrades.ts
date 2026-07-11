import type { BuildingId, Cost, StatId } from '../game/types';

export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  cost: Cost;
  stat: StatId;
  mult: number; // for 'aleThrift': divides ale consumption
  unlockDepth: number;
  requiresBuilding?: BuildingId;
}

export const UPGRADE_LIST: UpgradeConfig[] = [
  // mining (6)
  { id: 'sharpPicks', name: 'Sharpened Picks', description: 'Miners work x1.5 faster.', cost: { stone: 100 }, stat: 'mining', mult: 1.5, unlockDepth: 10 },
  { id: 'oreCarts', name: 'Ore Carts', description: 'Haul more per trip. Mining x1.5.', cost: { stone: 500 }, stat: 'mining', mult: 1.5, unlockDepth: 75 },
  { id: 'ironPicks', name: 'Iron Picks', description: 'Proper tools at last. Mining x2.', cost: { ingot: 8 }, stat: 'mining', mult: 2, unlockDepth: 90, requiresBuilding: 'forge' },
  { id: 'deepLanterns', name: 'Deep Lanterns', description: 'See what you strike. Mining x1.5.', cost: { stone: 2000, gold: 20 }, stat: 'mining', mult: 1.5, unlockDepth: 200 },
  { id: 'gemDrills', name: 'Gem-Tipped Drills', description: 'Cuts rock like cheese. Mining x2.', cost: { gem: 15 }, stat: 'mining', mult: 2, unlockDepth: 450 },
  { id: 'runePicks', name: 'Runed Picks', description: 'The ancestors guide each swing. Mining x2.', cost: { gold: 500, gem: 40 }, stat: 'mining', mult: 2, unlockDepth: 1000 },
  // click (3)
  { id: 'heavyHammer', name: 'Heavy Hammer', description: 'Your clicks hit x2 harder.', cost: { stone: 50 }, stat: 'click', mult: 2, unlockDepth: 0 },
  { id: 'kingsGloves', name: "King's Gloves", description: 'No blisters, no mercy. Clicks x2.', cost: { stone: 1000 }, stat: 'click', mult: 2, unlockDepth: 75 },
  { id: 'royalPick', name: 'Royal Pick', description: 'Gold-inlaid, absurdly effective. Clicks x3.', cost: { gold: 100 }, stat: 'click', mult: 3, unlockDepth: 200 },
  // smelt (3)
  { id: 'bellows', name: 'Great Bellows', description: 'Hotter furnace. Smelting x1.5.', cost: { stone: 300 }, stat: 'smelt', mult: 1.5, unlockDepth: 75, requiresBuilding: 'smelter' },
  { id: 'cokeFurnace', name: 'Coke Furnace', description: 'Burns cleaner and meaner. Smelting x2.', cost: { ingot: 20 }, stat: 'smelt', mult: 2, unlockDepth: 200, requiresBuilding: 'smelter' },
  { id: 'runicCrucible', name: 'Runic Crucible', description: 'Metal remembers its shape. Smelting x2.', cost: { gem: 10 }, stat: 'smelt', mult: 2, unlockDepth: 450, requiresBuilding: 'forge' },
  // brew (3)
  { id: 'copperKettles', name: 'Copper Kettles', description: 'Brewing x1.5.', cost: { stone: 200 }, stat: 'brew', mult: 1.5, unlockDepth: 25, requiresBuilding: 'brewery' },
  { id: 'oakBarrels', name: 'Oak Barrels', description: 'Ages beautifully. Brewing x1.5.', cost: { ingot: 10 }, stat: 'brew', mult: 1.5, unlockDepth: 90, requiresBuilding: 'brewery' },
  { id: 'mushroomHops', name: 'Cave Mushroom Hops', description: 'A bold, earthy vintage. Brewing x2.', cost: { gold: 50 }, stat: 'brew', mult: 2, unlockDepth: 200, requiresBuilding: 'brewery' },
  // aleThrift (2)
  { id: 'wateredAle', name: 'Watered-Down Ale', description: "Don't tell anyone. Ale lasts x1.25 longer.", cost: { stone: 300 }, stat: 'aleThrift', mult: 1.25, unlockDepth: 100 },
  { id: 'regulationTankards', name: 'Regulation Tankards', description: 'Standard issue. Ale lasts x1.5 longer.', cost: { gold: 30 }, stat: 'aleThrift', mult: 1.5, unlockDepth: 250 },
  // dig (3)
  { id: 'deepMaps', name: 'Maps of the Deep', description: 'Scouts chart faster routes. Digging x1.5.', cost: { gold: 20 }, stat: 'dig', mult: 1.5, unlockDepth: 200, requiresBuilding: 'greatHall' },
  { id: 'blastingPowder', name: 'Blasting Powder', description: 'What could go wrong? Digging x2.', cost: { ingot: 30 }, stat: 'dig', mult: 2, unlockDepth: 300 },
  { id: 'earthwardCharms', name: 'Earthward Charms', description: 'The stone parts willingly. Digging x1.5.', cost: { gem: 20 }, stat: 'dig', mult: 1.5, unlockDepth: 450, requiresBuilding: 'temple' },
  // offline (2)
  { id: 'nightShift', name: 'Night Shift', description: 'The hold never sleeps. Offline progress x1.5.', cost: { ingot: 15 }, stat: 'offline', mult: 1.5, unlockDepth: 120, requiresBuilding: 'greatHall' },
  { id: 'ancestralOverseers', name: 'Ancestral Overseers', description: 'The dead keep excellent books. Offline x2.', cost: { gem: 25 }, stat: 'offline', mult: 2, unlockDepth: 450, requiresBuilding: 'temple' },
];

export const UPGRADES: Record<string, UpgradeConfig> = Object.fromEntries(
  UPGRADE_LIST.map((u) => [u.id, u]),
);