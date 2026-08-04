'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Search, LogOut, Settings, User as UserIcon, Command } from 'lucide-react';
import { get, post } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCommand } from './command-store';
import { Avatar } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui/dropdown-menu';
import { useNotifStore } from '@/lib/notif-store';
import type { Notification } from '@/lib/types';
import { timeAgo } from '@/lib/utils';

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { setOpen } = useCommand();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const unread = useNotifStore((s) => s.unread);
  const setUnread = useNotifStore((s) => s.setUnread);
  const bumped = useNotifStore((s) => s.bumped);
  const [openNotifs, setOpenNotifs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const load = async () => {
    try {
      const res = await get<{ items: Notification[]; unread: number }>('/notifications?perPage=8');
      setNotifs(res.items);
      setUnread(res.unread);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (bumped > 0) load();
  }, [bumped]);

  const markAll = async () => {
    await post('/notifications/read-all');
    setUnread(0);
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      {onMenu && (
        <button onClick={onMenu} className="lg:hidden">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      )}

      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-xl border bg-muted/30 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60 sm:hidden"
      >
        <Search className="h-4 w-4" /> Search
      </button>

      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-xs items-center gap-2 rounded-xl border bg-card/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent sm:flex"
      >
        <Search className="h-4 w-4" /> Search…
        <span className="ml-auto flex items-center gap-0.5">
          <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Ctrl</kbd>
          <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">K</kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu open={openNotifs} onOpenChange={setOpenNotifs} trigger={
          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {unread}
              </span>
            )}
          </button>
        }>
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={markAll} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>
          <DropdownSeparator />
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 && <div className="px-3 py-6 text-center text-xs text-muted-foreground">No notifications</div>}
            {notifs.map((n) => (
              <DropdownItem key={n.id} onClick={() => { router.push('/notifications'); setOpenNotifs(false); }}>
                <span className={`h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                <span className="flex-1">
                  <span className="block truncate font-medium">{n.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{n.message}</span>
                  <span className="block text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                </span>
              </DropdownItem>
            ))}
          </div>
        </DropdownMenu>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} trigger={
          <Avatar name={user?.name} src={user?.avatar} className="cursor-pointer" />
        }>
          <div className="flex items-center gap-2 px-2.5 py-2">
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
            <div>
              <div className="text-sm font-semibold leading-tight">{user?.name}</div>
              <div className="text-[11px] text-muted-foreground">{user?.role === 'MANAGER' ? 'Manager' : user?.designation || 'Employee'}</div>
            </div>
          </div>
          <DropdownSeparator />
          <DropdownItem icon={<UserIcon className="h-4 w-4" />} onClick={() => { router.push('/settings'); setMenuOpen(false); }}>
            Profile & settings
          </DropdownItem>
          <DropdownItem icon={<LogOut className="h-4 w-4" />} danger onClick={logout}>
            Sign out
          </DropdownItem>
        </DropdownMenu>
      </div>
    </header>
  );
}