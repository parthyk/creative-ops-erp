import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Creative Ops ERP',
  description: 'Creative Operations ERP for marketing agencies',
};

// Render every route on-demand. Prevents Vercel serving stale statically-prerendered
// shells (e.g. /dashboard, /kpi) whose HTML mismatches the deployed JS bundle, which
// broke client hydration and left data-driven pages stuck on their loading skeleton.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
