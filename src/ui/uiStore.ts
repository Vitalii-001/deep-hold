import { create } from 'zustand';
import type { OfflineSummary } from '../game/offline';

export type PanelTab = 'workers' | 'buildings' | 'upgrades';

export interface UiStore {
  offlineSummary: OfflineSummary | null;
  toasts: { id: number; text: string }[];
  activeTab: PanelTab;
  setOfflineSummary: (s: OfflineSummary | null) => void;
  pushToast: (text: string) => void;
  removeToast: (id: number) => void;
  setActiveTab: (t: PanelTab) => void;
}

let toastId = 0;

export const useUi = create<UiStore>()((set) => ({
  offlineSummary: null,
  toasts: [],
  activeTab: 'workers',
  setOfflineSummary: (s) => set({ offlineSummary: s }),
  pushToast: (text) => set((u) => ({ toasts: [...u.toasts, { id: ++toastId, text }] })),
  removeToast: (id) => set((u) => ({ toasts: u.toasts.filter((t) => t.id !== id) })),
  setActiveTab: (t) => set({ activeTab: t }),
}));
