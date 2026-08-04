'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Target, TrendingUp } from 'lucide-react';
import { get } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/lib/hooks';
import { PageHeader, Loading } from '@/components/shared/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/misc';
import { Avatar } from '@/components/ui/skeleton';
import { ScoreRing } from '@/components/charts/charts';
import { KPI_LABELS } from '@/lib/constants';

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

const SCORES: { key: string; color: string }[] = [
  { key: 'onTime', color: '#22c55e' },
  { key: 'productivity', color: '#3b82f6' },
  { key: 'quality', color: '#8b5cf6' },
  { key: 'revision', color: '#f59e0b' },
  { key: 'satisfaction', color: '#ec4899' },
  { key: 'creativity', color: '#14b8a6' },
  { key: 'attendance', color: '#06b6d4' },
  { key: 'collaboration', color: '#6366f1' },
];

function gradeColor(score: number) {
  if (score >= 90) return '#22c55e';
  if (score >= 80) return '#f59e0b';
  if (score >= 70) return '#8b5cf6';
  return '#ef4444';
}

export default function KpiPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [period, setPeriod] = useState('month');

  const { data: myKpi, loading } = useFetch<any>(`/kpi/employee?period=${period}`);
  const { data: team, loading: teamLoading } = useFetch<any>(isManager ? `/kpi/team?period=${period}` : null);
  const { data: board, loading: boardLoading } = useFetch<any[]>(isManager ? `/kpi/leaderboard?period=${period}` : null);

  const kpi = myKpi;
  const scores = kpi?.scores || {};

  if (loading || (isManager && (teamLoading || boardLoading))) return <Loading label="Computing KPI scores…" />;

  const weights: Record<string, number> = kpi?.weights || {};

  return (
    <div className="space-y-6">
      <PageHeader title="KPI Dashboard" description="Weighted performance scorecard for creative teams">
        <Tabs value={period} onChange={setPeriod} tabs={PERIODS.map((p) => ({ value: p.value, label: p.label }))} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overall score */}
        <Card className="flex items-center justify-center p-8">
          <div className="flex items-center gap-6">
            <ScoreRing value={kpi?.overall ?? 0} size={160} color={gradeColor(kpi?.overall ?? 0)} />
            <div className="space-y-1">
              <p className="text-2xl font-bold">{kpi?.label}</p>
              <p className="text-sm text-muted-foreground">{kpi?.summary?.total ?? 0} tasks · {kpi?.summary?.done ?? 0} done</p>
              {kpi?.rank && <p className="text-sm font-medium text-primary">Rank #{kpi.rank}</p>}
              {isManager && team && (
                <p className="text-xs text-muted-foreground">Team avg: <span className="font-semibold text-foreground">{team.overall}</span></p>
              )}
            </div>
          </div>
        </Card>

        {/* Score breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Score breakdown</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {SCORES.map((s) => (
              <div key={s.key}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{KPI_LABELS[s.key] || s.key}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: s.color }}>{Math.round(scores[s.key] ?? 0)}</span>
                    <span className="text-xs text-muted-foreground">({weights[s.key] ?? 0}%)</span>
                  </span>
                </div>
                <Progress value={scores[s.key] ?? 0} color={s.color} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Manager: predicted radar-like list + leaderboard */}
      {isManager && board && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Team overview</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(team?.averages || {})
                .filter(([, v]: any) => typeof v === 'number')
                .slice(0, 8)
                .map(([k, v]: any) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{KPI_LABELS[k] || k}</span>
                    <span className="font-semibold">{Math.round(v)}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" /> Leaderboard</CardTitle>
              <Link href="/leaderboard" className="text-xs text-primary hover:underline">Full leaderboard</Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {board.slice(0, 8).map((e: any, i: number) => (
                <div key={e.id} className="flex items-center gap-3">
                  <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                  <Avatar name={e.name} src={e.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.department}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: gradeColor(e.overall) }}>{e.overall}</span>
                </div>
              ))}
              {!board.length && <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}