import { create } from 'zustand';
import type { OfflineSummary } from '../game/offline';

export interface UiStore {
  offlineSummary: OfflineSummary | null;
  toasts: { id: number; text: string }[];
  setOfflineSummary: (s: OfflineSummary | null) => void;
  pushToast: (text: string) => void;
  removeToast: (id: number) => void;
}

let toastId = 0;

export const useUi = create<UiStore>()((set) => ({
  offlineSummary: null,
  toasts: [],
  setOfflineSummary: (s) => set({ offlineSummary: s }),
  pushToast: (text) => set((u) => ({ toasts: [...u.toasts, { id: ++toastId, text }] })),
  removeToast: (id) => set((u) => ({ toasts: u.toasts.filter((t) => t.id !== id) })),
}));