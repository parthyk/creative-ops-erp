'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trophy, Medal } from 'lucide-react';
import { useFetch } from '@/lib/hooks';
import { PageHeader } from '@/components/shared/common';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

function gradeColor(score: number) {
  if (score >= 90) return '#22c55e';
  if (score >= 80) return '#f59e0b';
  if (score >= 70) return '#8b5cf6';
  return '#ef4444';
}

const PODIUM = ['bg-gradient-to-b from-amber-400 to-amber-600', 'bg-gradient-to-b from-slate-300 to-slate-500', 'bg-gradient-to-b from-orange-300 to-orange-500'];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState('month');
  const { data: board, loading, reload } = useFetch<any[]>(`/kpi/leaderboard?period=${period}`);

  useEffect(() => {
    reload();
  }, [period, reload]);

  return (
    <div className="space-y-6">
      <PageHeader title="Leaderboard" description="🏆 Employee ranking by weighted KPI score">
        <Tabs value={period} onChange={setPeriod} tabs={PERIODS} />
      </PageHeader>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : !board?.length ? (
        <p className="py-16 text-center text-muted-foreground">No rankings available</p>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-3 items-end gap-4">
            {[1, 0, 2].map((idx) => {
              const e = board[idx];
              if (!e) return <div key={idx} />;
              const heights = ['h-28', 'h-40', 'h-24'];
              return (
                <div key={e.id} className="flex flex-col items-center">
                  <Avatar name={e.name} src={e.avatar} size="xl" className={cn(idx === 0 && 'ring-4 ring-amber-400')} />
                  <p className="mt-2 text-sm font-semibold">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{e.department}</p>
                  <div className={cn('mt-2 flex w-full items-start justify-center rounded-t-2xl text-white shadow-lg', PODIUM[idx], heights[idx])}>
                    <span className="mt-4 flex flex-col items-center">
                      <Medal className="h-5 w-5" />
                      <span className="mt-1 text-2xl font-bold">{e.overall}</span>
                      <span className="text-[10px] opacity-80">{e.done} done</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full list */}
          <Card>
            <CardContent className="p-2">
              {board.map((e: any, i: number) => (
                <div key={e.id} className={cn('flex items-center gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-accent', i < 3 && 'bg-muted/40')}>
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl font-bold', i === 0 ? 'bg-amber-500/15 text-amber-500' : i === 1 ? 'bg-slate-400/15 text-slate-400' : i === 2 ? 'bg-orange-400/15 text-orange-400' : 'bg-muted text-muted-foreground')}>
                    {i + 1}
                  </span>
                  <Avatar name={e.name} src={e.avatar} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.department} · {e.designation || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{e.done}/{e.total} done</span>
                    <span className="w-14 text-right text-lg font-bold" style={{ color: gradeColor(e.overall) }}>{e.overall}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}