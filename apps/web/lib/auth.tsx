'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, setTokens, getAccessToken, setUnauthorizedHandler } from './api';
import { useAuthStore } from './store';
import { connectSocket, disconnectSocket } from './socket';
import { useNotifStore } from './notif-store';
import type { User } from './types';

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, portal: 'MANAGER' | 'EMPLOYEE') => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, setAuth, setUser, clear } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      try {
        const me = await api<User>('/auth/me');
        if (!mounted) return;
        setAuth(me, getAccessToken() || '');
        connectSocket(me.id);
      } catch {
        if (!mounted) return;
        clear();
      } finally {
        if (mounted) useAuthStore.setState({ loading: false });
      }
    };
    setUnauthorizedHandler(() => {
      clear();
      router.replace('/login');
    });
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [router, setAuth, clear]);

  const login = async (email: string, password: string, portal: 'MANAGER' | 'EMPLOYEE') => {
    const res = await api<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password, portal },
    });
    setTokens(res.accessToken, res.refreshToken);
    setAuth(res.user, res.accessToken);
    connectSocket(res.user.id);
    router.replace('/dashboard');
  };

  const logout = () => {
    try {
      api('/auth/logout', { method: 'POST' }).catch(() => null);
    } catch {
      /* ignore */
    }
    disconnectSocket();
    useNotifStore.setState({ unread: 0, bumped: 0 });
    setTokens(null, null);
    clear();
    router.replace('/login');
  };

  return <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
