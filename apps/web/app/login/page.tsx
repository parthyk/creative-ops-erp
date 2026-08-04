'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const [portal, setPortal] = useState<'MANAGER' | 'EMPLOYEE'>('EMPLOYEE');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password, portal);
      toast.success(`Welcome to the ${portal === 'MANAGER' ? 'Management' : 'Employee'} portal`);
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card relative z-10 w-full max-w-md p-8"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="animated-gradient mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-xl">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Creative Ops ERP</h1>
          <p className="mt-1 text-sm text-muted-foreground">for OneDot Media · Creative operations & productivity</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border bg-muted/40 p-1">
          <PortalTab
            active={portal === 'MANAGER'}
            onClick={() => setPortal('MANAGER')}
            icon={<Shield className="h-4 w-4" />}
            label="Management"
          />
          <PortalTab
            active={portal === 'EMPLOYEE'}
            onClick={() => setPortal('EMPLOYEE')}
            icon={<User className="h-4 w-4" />}
            label="Employee"
          />
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={portal === 'MANAGER' ? 'admin@onedot.com' : 'sneha@onedot.com'}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-dashed bg-muted/20 p-3 text-center text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p className="mt-1">
            Management: <code className="rounded bg-muted px-1">admin@onedot.com / Admin@123</code>
          </p>
          <p>
            Employee: <code className="rounded bg-muted px-1">sneha@onedot.com / Pass@123</code>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function PortalTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors ${
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {active && (
        <motion.span
          layoutId="portal-pill"
          className="absolute inset-0 rounded-xl bg-card shadow-sm"
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="relative z-10">{label}</span>
    </button>
  );
}