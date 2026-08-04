import { create } from 'zustand';

interface NotifState {
  unread: number;
  bumped: number;
  setUnread: (n: number) => void;
  bump: () => void;
}

export const useNotifStore = create<NotifState>((set) => ({
  unread: 0,
  bumped: 0,
  setUnread: (unread) => set({ unread }),
  bump: () => set((s) => ({ bumped: s.bumped + 1 })),
}));