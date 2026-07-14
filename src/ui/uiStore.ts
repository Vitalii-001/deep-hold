import { create } from 'zustand';
import type { OfflineSummary } from '../game/offline';

export type ActivePanel =
  | 'overview'
  | 'workers'
  | 'buildings'
  | 'upgrades'
  | 'milestones'
  | 'stats'
  | 'adBoosts';

export interface UiStore {
  offlineSummary: OfflineSummary | null;
  toasts: { id: number; text: string }[];
  activePanel: ActivePanel;
  creditsOpen: boolean;
  setOfflineSummary: (s: OfflineSummary | null) => void;
  pushToast: (text: string) => void;
  removeToast: (id: number) => void;
  setActivePanel: (p: ActivePanel) => void;
  setCreditsOpen: (v: boolean) => void;
}

let toastId = 0;

export const useUi = create<UiStore>()((set) => ({
  offlineSummary: null,
  toasts: [],
  activePanel: 'workers',
  creditsOpen: false,
  setOfflineSummary: (s) => set({ offlineSummary: s }),
  pushToast: (text) => set((u) => ({ toasts: [...u.toasts, { id: ++toastId, text }] })),
  removeToast: (id) => set((u) => ({ toasts: u.toasts.filter((t) => t.id !== id) })),
  setActivePanel: (p) => set({ activePanel: p }),
  setCreditsOpen: (v) => set({ creditsOpen: v }),
}));
