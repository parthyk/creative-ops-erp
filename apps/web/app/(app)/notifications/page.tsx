'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, CheckCheck, BellRing, CalendarDays, MessageSquare, AtSign, UserPlus, AlertTriangle, RefreshCw, Settings } from 'lucide-react';
import { get, patch, post } from '@/lib/api';
import { useNotifStore } from '@/lib/notif-store';
import { PageHeader, EmptyState } from '@/components/shared/common';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, timeAgo } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ASSIGNMENT: { label: 'Assignment', icon: <UserPlus className="h-4 w-4" />, color: 'bg-violet-500/15 text-violet-500' },
  DUE_TODAY: { label: 'Due today', icon: <CalendarDays className="h-4 w-4" />, color: 'bg-amber-500/15 text-amber-500' },
  DELAYED: { label: 'Delayed', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-red-500/15 text-red-500' },
  APPROVAL: { label: 'Approval', icon: <Settings className="h-4 w-4" />, color: 'bg-emerald-500/15 text-emerald-500' },
  COMMENT: { label: 'Comment', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-blue-500/15 text-blue-500' },
  MENTION: { label: 'Mention', icon: <AtSign className="h-4 w-4" />, color: 'bg-fuchsia-500/15 text-fuchsia-500' },
  TASK_UPDATE: { label: 'Update', icon: <RefreshCw className="h-4 w-4" />, color: 'bg-cyan-500/15 text-cyan-500' },
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const bumped = useNotifStore((s) => s.bumped);

  const load = async () => {
    setLoading(true);
    try {
      const res = await get<{ items: Notification[] }>('/notifications?perPage=100');
      setItems(res.items);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (bumped > 0) load();
  }, [bumped]);

  const markRead = async (n: Notification) => {
    if (n.read) return;
    await patch(`/notifications/${n.id}/read`);
    setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    useNotifStore.getState().setUnread(Math.max(0, useNotifStore.getState().unread - 1));
  };

  const markAll = async () => {
    await post('/notifications/read-all');
    setItems((xs) => xs.map((x) => ({ ...x, read: true })));
    useNotifStore.getState().setUnread(0);
    toast.success('All notifications marked as read');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Notifications" description="Assignments, deadlines and updates">
        <Button variant="outline" size="sm" onClick={markAll}><CheckCheck className="h-4 w-4" /> Mark all read</Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : !items.length ? (
        <EmptyState icon={<Bell className="h-5 w-5" />} title="All caught up" description="No notifications yet." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.TASK_UPDATE;
            return (
              <Card
                key={n.id}
                onClick={() => markRead(n)}
                className={cn('flex cursor-pointer items-start gap-3 p-4 transition-all', !n.read && 'border-primary/40 bg-primary/[0.03]')}
              >
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.color)}>{meta.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  {n.message && <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>}
                  <p className="mt-1 text-xs text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                </div>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{meta.label}</span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}