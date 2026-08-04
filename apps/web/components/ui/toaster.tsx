'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { useTheme } from 'next-themes';

export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme as 'light' | 'dark'}
      position="bottom-right"
      richColors
      toastOptions={{
        style: { borderRadius: '12px', border: '1px solid hsl(var(--border))' },
      }}
    />
  );
}