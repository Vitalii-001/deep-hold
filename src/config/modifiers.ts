import type { StatId } from '../game/types';

// Permanent modifiers (Phase 3): a single registry powering Royal Order rewards,
// permanent Discovery choices (§6.4 3.5) and — later — displayed artifacts.
// State stores owned ids in `permanentBonuses`; economy reads their effects.
export interface ModifierConfig {
  id: string;
  name: string;
  description: string;
  allProduction?: number; // multiplier applied to every production stat (mining/smelt/brew)
  stat?: StatId; // single-stat multiplier target
  statMult?: number;
  minerCapBonus?: number; // flat extra miner slots
  aleStorageBonus?: number; // flat extra ale storage
}

export const MODIFIERS: Record<string, ModifierConfig> = {
  royalFavor: { id: 'royalFavor', name: 'Royal Favor', description: '+8% all production.', allProduction: 1.08 },
  ancestralWard: { id: 'ancestralWard', name: 'Ancestral Ward', description: '+5% all production.', allProduction: 1.05 },
  deepMineCharter: { id: 'deepMineCharter', name: 'Deep Mine Charter', description: '+3 miner slots.', minerCapBonus: 3 },
  brewersGuild: { id: 'brewersGuild', name: "Brewers' Guild", description: '+100 ale storage.', aleStorageBonus: 100 },
  gildedPicks: { id: 'gildedPicks', name: 'Gilded Picks', description: 'Digging x1.1.', stat: 'dig', statMult: 1.1 },
  ironPact: { id: 'ironPact', name: 'Iron Pact', description: 'Mining x1.12.', stat: 'mining', statMult: 1.12 },
  // discovery-granted
  clanHonor: { id: 'clanHonor', name: 'Clan Honor', description: '+4% all production.', allProduction: 1.04 },
  ancientKnowledge: { id: 'ancientKnowledge', name: 'Ancient Knowledge', description: 'Smelting x1.15.', stat: 'smelt', statMult: 1.15 },
  // Market perks (§3): quality-of-life only — offline yield & storage, never
  // active production. Purchased with Crowns; the id doubles as the perk id.
  nightShiftPact: { id: 'nightShiftPact', name: 'Night Shift Pact', description: '+25% offline yield.', stat: 'offline', statMult: 1.25 },
  mastersLedger: { id: 'mastersLedger', name: "Master's Ledger", description: '+40% offline yield.', stat: 'offline', statMult: 1.4 },
  deepCellar: { id: 'deepCellar', name: 'Deep Cellar', description: '+200 ale storage.', aleStorageBonus: 200 },
};
