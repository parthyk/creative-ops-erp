import { create } from 'zustand';
import type { User } from './types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,
  setAuth: (user, token) => set({ user, token, loading: false }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, token: null, loading: false }),
}));
