import type { ActivePanel } from '../uiStore';

export interface NavItem {
  id: ActivePanel;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'workers', label: 'Workers', icon: '⛏️' },
  { id: 'buildings', label: 'Buildings', icon: '🏠' },
  { id: 'upgrades', label: 'Upgrades', icon: '⭐' },
  { id: 'adBoosts', label: 'Ad Boosts', icon: '📺' },
];
