import type { ActivePanel } from '../uiStore';

export interface NavItem {
  id: ActivePanel;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: '📜' },
  { id: 'workers', label: 'Workers', icon: '⛏️' },
  { id: 'buildings', label: 'Buildings', icon: '🏠' },
  { id: 'upgrades', label: 'Upgrades', icon: '⭐' },
  { id: 'orders', label: 'Orders', icon: '📜' },
  { id: 'milestones', label: 'Milestones', icon: '🏁' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'adBoosts', label: 'Ad Boosts', icon: '📺' },
];
