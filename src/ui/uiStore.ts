import { create } from 'zustand';
import type { OfflineSummary } from '../game/offline';

export type ActivePanel =
  | 'overview'
  | 'workers'
  | 'buildings'
  | 'upgrades'
  | 'orders'
  | 'milestones'
  | 'stats'
  | 'adBoosts';

export interface ConfirmationRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface UiStore {
  offlineSummary: OfflineSummary | null;
  latestOfflineSummary: OfflineSummary | null;
  toasts: { id: number; text: string }[];
  activePanel: ActivePanel;
  creditsOpen: boolean;
  settingsOpen: boolean;
  kingsHallOpen: boolean;
  adPlaying: boolean; // rewarded ad in flight: sim paused, audio muted, UI blocked
  confirmation: ConfirmationRequest | null;
  setOfflineSummary: (s: OfflineSummary | null) => void;
  pushToast: (text: string) => void;
  removeToast: (id: number) => void;
  setActivePanel: (p: ActivePanel) => void;
  setCreditsOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  openKingsHall: () => void;
  closeKingsHall: () => void;
  setAdPlaying: (v: boolean) => void;
  openConfirmation: (request: ConfirmationRequest) => void;
  closeConfirmation: () => void;
}

let toastId = 0;

export const useUi = create<UiStore>()((set) => ({
  offlineSummary: null,
  latestOfflineSummary: null,
  toasts: [],
  activePanel: 'overview',
  creditsOpen: false,
  settingsOpen: false,
  kingsHallOpen: false,
  adPlaying: false,
  confirmation: null,
  setOfflineSummary: (s) => set((u) => ({ offlineSummary: s, latestOfflineSummary: s ?? u.latestOfflineSummary })),
  // Keep only the most recent few so bursts of events (hire, build, upgrade)
  // never pile into a tall, intrusive column.
  pushToast: (text) => set((u) => ({ toasts: [...u.toasts, { id: ++toastId, text }].slice(-4) })),
  removeToast: (id) => set((u) => ({ toasts: u.toasts.filter((t) => t.id !== id) })),
  setActivePanel: (p) => set({ activePanel: p }),
  setCreditsOpen: (v) => set({ creditsOpen: v }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  openKingsHall: () => set({ kingsHallOpen: true }),
  closeKingsHall: () => set({ kingsHallOpen: false }),
  setAdPlaying: (v) => set({ adPlaying: v }),
  openConfirmation: (request) => set({ confirmation: request }),
  closeConfirmation: () => set({ confirmation: null }),
}));
