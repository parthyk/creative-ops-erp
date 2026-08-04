const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const API_BASE = `${API_URL}/api/v1`;

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    if (refresh) localStorage.setItem('co_refresh', refresh);
    else localStorage.removeItem('co_refresh');
  }
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

async function tryRefresh(): Promise<boolean> {
  const stored = refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('co_refresh') : null);
  if (!stored) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any; headers?: Record<string, string>; formData?: FormData } = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, formData } = options;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const request = async (): Promise<Response> => {
    const h: Record<string, string> = { ...headers };
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    if (formData) {
      return fetch(url, { method, headers: h, body: formData });
    }
    if (body !== undefined) h['Content-Type'] = 'application/json';
    return fetch(url, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined });
  };

  let res = await request();
  if (res.status === 401 && !url.includes('/auth/refresh') && !url.includes('/auth/login')) {
    const ok = await tryRefresh();
    if (ok) {
      res = await request();
    } else {
      setTokens(null, null);
      onUnauthorized?.();
    }
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      message = Array.isArray(err.message) ? err.message.join(', ') : err.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const get = <T = any>(path: string) => api<T>(path);
export const post = <T = any>(path: string, body?: any) => api<T>(path, { method: 'POST', body });
export const patch = <T = any>(path: string, body?: any) => api<T>(path, { method: 'PATCH', body });
export const del = <T = any>(path: string) => api<T>(path, { method: 'DELETE' });

export function authorizedFetch(url: string, init?: RequestInit) {
  const headers = { ...(init?.headers || {}) } as Record<string, string>;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(url, { ...init, headers });
}
