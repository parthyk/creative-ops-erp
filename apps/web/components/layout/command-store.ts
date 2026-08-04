'use client';

import { create } from 'zustand';

interface CommandState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useCommand = create<CommandState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));