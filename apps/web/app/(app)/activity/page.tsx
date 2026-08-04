'use client';

import { useMemo } from 'react';
import { Activity as ActivityIcon } from 'lucide-react';
import { useFetch } from '@/lib/hooks';
import { PageHeader, EmptyState } from '@/components/shared/common';
import { Avatar } from '@/components/ui/skeleton';
import { timeAgo, formatDate } from '@/lib/utils';

export default function ActivityPage() {
  const { data, loading } = useFetch<any>('/activity?limit=200');

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const a of data?.items || []) {
      const key = new Date(a.createdAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()];
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Activity Timeline" description="Every action across the studio, in real time" />

      {!grouped.length ? (
        <EmptyState title="No activity yet" />
      ) : (
        grouped.map(([day, items]) => (
          <div key={day}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatDate(day)}</p>
            <div className="relative space-y-2 pl-5 before:absolute before:left-[7px] before:top-1 before:h-[calc(100%-8px)] before:w-px before:bg-border">
              {items.map((a) => (
                <div key={a.id} className="relative flex gap-3 pb-1">
                  <span className="absolute -left-5 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-background bg-primary" />
                  <Avatar name={a.user?.name || a.userName} src={a.user?.avatar} size="sm" />
                  <div className="min-w-0 flex-1 rounded-xl border bg-card px-3 py-2">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{a.user?.name || a.userName}</span>{' '}
                      <span className="text-muted-foreground">{a.action}</span>
                      {a.meta?.task && <span className="text-muted-foreground"> · {a.meta.task}</span>}
                      {a.meta?.client && <span className="font-medium text-primary"> · {a.meta.client}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}