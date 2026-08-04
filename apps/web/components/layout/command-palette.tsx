'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, FileText, LayoutDashboard, ListTodo, Briefcase, Users, Target, CalendarDays, Settings, FolderOpen, Activity, Sparkles, CornerDownLeft } from 'lucide-react';
import { useCommand } from './command-store';
import { useAuth } from '@/lib/auth';

const ALL_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', keywords: 'home overview kpi', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/tasks', label: 'My Tasks', keywords: 'tasks todo daily work', icon: <ListTodo className="h-4 w-4" /> },
  { href: '/kanban', label: 'Kanban Board', keywords: 'board workflow status', icon: <ListTodo className="h-4 w-4" /> },
  { href: '/clients', label: 'Clients', keywords: 'accounts brands retainer', icon: <Briefcase className="h-4 w-4" /> },
  { href: '/employees', label: 'Employees', keywords: 'team people staff', icon: <Users className="h-4 w-4" />, managerOnly: true },
  { href: '/kpi', label: 'KPI Dashboard', keywords: 'score performance metric', icon: <Target className="h-4 w-4" /> },
  { href: '/leaderboard', label: 'Leaderboard', keywords: 'rank top performers', icon: <Sparkles className="h-4 w-4" />, managerOnly: true },
  { href: '/ai', label: 'AI Insights', keywords: 'ai analysis workload predict', icon: <Search className="h-4 w-4" />, managerOnly: true },
  { href: '/reports', label: 'Reports & Exports', keywords: 'pdf excel csv weekly monthly', icon: <FileText className="h-4 w-4" />, managerOnly: true },
  { href: '/calendar', label: 'Calendar', keywords: 'schedule attendance leave holiday', icon: <CalendarDays className="h-4 w-4" /> },
  { href: '/files', label: 'File Manager', keywords: 'files upload brand assets', icon: <FolderOpen className="h-4 w-4" /> },
  { href: '/activity', label: 'Activity Timeline', keywords: 'activity log audit', icon: <Activity className="h-4 w-4" /> },
  { href: '/settings', label: 'Settings', keywords: 'preferences config departments', icon: <Settings className="h-4 w-4" /> },
];

export function CommandPalette() {
  const { open, setOpen } = useCommand();
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_ITEMS.filter((i) => !i.managerOnly || user?.role === 'MANAGER')
      .filter((i) => !q || i.label.toLowerCase().includes(q) || i.keywords.includes(q));
  }, [query, user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  useEffect(() => setIndex(0), [query]);

  const go = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery('');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') setIndex((i) => Math.min(items.length - 1, i + 1));
                  if (e.key === 'ArrowUp') setIndex((i) => Math.max(0, i - 1));
                  if (e.key === 'Enter' && items[index]) go(items[index].href);
                }}
                placeholder="Search pages, commands…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {items.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">No results for "{query}"</div>
              )}
              {items.map((item, i) => (
                <button
                  key={item.href}
                  onClick={() => go(item.href)}
                  onMouseEnter={() => setIndex(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${i === index ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'}`}
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {i === index && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}