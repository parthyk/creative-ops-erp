'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import {
  LayoutDashboard, ListTodo, KanbanSquare, Briefcase, Users,
  Target, Sparkles, Search, FileText, CalendarDays, FolderOpen,
  Activity, Bell, Settings, Sparkles as LogoIcon, Moon, Sun,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  managerOnly?: boolean;
  employeeOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
  { href: '/tasks', label: 'Tasks', icon: <ListTodo className="h-[18px] w-[18px]" /> },
  { href: '/kanban', label: 'Kanban', icon: <KanbanSquare className="h-[18px] w-[18px]" /> },
  { href: '/clients', label: 'Clients', icon: <Briefcase className="h-[18px] w-[18px]" /> },
  { href: '/employees', label: 'Employees', icon: <Users className="h-[18px] w-[18px]" />, managerOnly: true },
  { href: '/kpi', label: 'KPIs', icon: <Target className="h-[18px] w-[18px]" /> },
  { href: '/leaderboard', label: 'Leaderboard', icon: <Sparkles className="h-[18px] w-[18px]" />, managerOnly: true },
  { href: '/ai', label: 'AI Insights', icon: <Search className="h-[18px] w-[18px]" />, managerOnly: true },
  { href: '/reports', label: 'Reports', icon: <FileText className="h-[18px] w-[18px]" />, managerOnly: true },
  { href: '/calendar', label: 'Calendar', icon: <CalendarDays className="h-[18px] w-[18px]" /> },
  { href: '/files', label: 'Files', icon: <FolderOpen className="h-[18px] w-[18px]" /> },
  { href: '/activity', label: 'Activity', icon: <Activity className="h-[18px] w-[18px]" /> },
  { href: '/notifications', label: 'Notifications', icon: <Bell className="h-[18px] w-[18px]" /> },
  { href: '/settings', label: 'Settings', icon: <Settings className="h-[18px] w-[18px]" /> },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();

  const items = NAV.filter((n) => (n.managerOnly ? isManager : true));

  return (
    <aside className={cn('flex h-full flex-col border-r bg-card/60 backdrop-blur-xl transition-all duration-300', collapsed ? 'w-16' : 'w-60')}>
      <div className="flex h-16 items-center gap-2.5 px-4">
        <div className="animated-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-lg">
          <LogoIcon className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">Creative Ops</p>
            <p className="text-[11px] text-muted-foreground">for OneDot Media</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item, i) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.02 }}
            >
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  active ? 'text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-inset ring-primary/20"
                    transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                {!collapsed && <span className="relative z-10">{item.label}</span>}
                {collapsed && (
                  <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {item.label}
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-1 flex h-9 w-full items-center gap-2 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <span className="text-sm">{collapsed ? '⟩' : '⟨'}</span>
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  );
}