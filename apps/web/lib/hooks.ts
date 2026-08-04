'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from './api';

export function useFetch<T = any>(path: string | null, options: { auto?: boolean } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path && options.auto !== false));
  const [error, setError] = useState<string | null>(null);
  const key = useRef(0);

  const load = useCallback(
    async (p?: string | null) => {
      const url = p ?? path;
      if (!url) return;
      const id = ++key.current;
      setLoading(true);
      setError(null);
      try {
        const res = await get<T>(url);
        if (id === key.current) setData(res);
      } catch (err: any) {
        if (id === key.current) setError(err.message || 'Failed to load');
      } finally {
        if (id === key.current) setLoading(false);
      }
    },
    [path],
  );

  const reload = useCallback(async () => load(), [load]);

  return { data, loading, error, reload, setData };
}