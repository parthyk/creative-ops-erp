'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Clock, AlertTriangle, Gauge, Star, Timer, Zap, TrendingUp,
  Target, Trophy, CalendarClock, ArrowRight, Sparkles,
} from 'lucide-react';
import { useFetch } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { PageHeader, StatCard, EmptyState, Loading } from '@/components/shared/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { Skeleton, Avatar } from '@/components/ui/skeleton';
import { TrendChart, DonutChart, ScoreRing } from '@/components/charts/charts';
import { formatDate, timeAgo } from '@/lib/utils';
import { STATUS_META } from '@/lib/constants';

export default function DashboardPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const [period, setPeriod] = useState('month');
  const { data: summary, loading } = useFetch<any>(`/dashboard/summary?period=${period}`);
  const { data: trend } = useFetch<any[]>(`/dashboard/trend?period=${period}`);
  const { data: growth } = useFetch<any>('/dashboard/growth');
  const { data: ranking } = useFetch<any[]>(isManager ? '/dashboard/ranking?period=month' : null);
  const { data: deptLoad } = useFetch<any[]>(isManager ? '/dashboard/departments?period=month' : null);
  const { data: activity } = useFetch<any>('/activity?limit=8');
  const { data: myDay } = useFetch<any>(!isManager ? '/tasks/my-day' : null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    );
  }

  const s = summary || {};
  const todayTasks = myDay?.items || [];
  const todaySummary = myDay?.summary;

  const trendData = (trend || []).map((d: any) => ({
    label: d.label.slice(5),
    Created: d.created,
    Done: d.done,
  }));

  const deptData = (deptLoad || []).map((d) => ({ name: d.name, Tasks: d.tasksInPeriod }));

  const statusData = [
    { name: 'Done', value: s.done || 0, color: '#22c55e' },
    { name: 'Pending', value: s.pending || 0, color: '#3b82f6' },
    { name: 'Delayed', value: s.delayed || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name.split(' ')[0]} 👋`}
        description={isManager ? 'Org-wide creative operations overview' : 'Here’s your work for today'}
      >
        <Tabs
          value={period}
          onChange={setPeriod}
          tabs={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ]}
        />
      </PageHeader>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={isManager ? 'Tasks (period)' : "Today's Tasks"} value={isManager ? s.total || 0 : todaySummary?.total || todayTasks.length || 0} icon={<CheckCircle2 className="h-5 w-5" />} gradient="from-violet-500 to-indigo-600" trend={growth ? { value: growth.growth } : undefined} />
        <StatCard label="Completed" value={isManager ? s.done || 0 : todaySummary?.done || 0} icon={<CheckCircle2 className="h-5 w-5" />} gradient="from-emerald-500 to-teal-600" sub={s.total ? `${Math.round((s.done / s.total) * 100)}% completion` : 'No tasks yet'} />
        <StatCard label="Pending" value={isManager ? s.pending || 0 : todaySummary?.pending || 0} icon={<Clock className="h-5 w-5" />} gradient="from-blue-500 to-indigo-600" />
        <StatCard label="Delayed" value={isManager ? s.delayed || 0 : todaySummary?.delayed || 0} icon={<AlertTriangle className="h-5 w-5" />} gradient="from-rose-500 to-red-600" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Productivity" value={`${s.productivity ?? 0}%`} icon={<Gauge className="h-5 w-5" />} gradient="from-fuchsia-500 to-pink-600" />
        <StatCard label="Performance Score" value={s.kpiOverall ?? '—'} icon={<Target className="h-5 w-5" />} gradient="from-amber-500 to-orange-600" />
        <StatCard label="Avg Delivery" value={`${s.avgDeliveryHours ?? 0}h`} icon={<Timer className="h-5 w-5" />} gradient="from-cyan-500 to-sky-600" sub="per completed task" />
        <StatCard label="Attendance" value={`${s.attendanceRate ?? 0}%`} icon={<CalendarClock className="h-5 w-5" />} gradient="from-indigo-500 to-blue-600" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Creative Utilisation" value={`${s.utilization ?? 0}%`} icon={<Zap className="h-5 w-5" />} gradient="from-emerald-500 to-green-600" />
        <StatCard label="Work Hours" value={`${s.workHours ?? 0}h`} icon={<TrendingUp className="h-5 w-5" />} gradient="from-violet-500 to-purple-600" />
        <StatCard label="On-time rate" value={`${s.onTimeRate ?? 0}%`} icon={<Star className="h-5 w-5" />} gradient="from-sky-500 to-blue-600" />
        {isManager && <StatCard label="Active employees" value={s.activeEmployeeCount ?? 0} icon={<Sparkles className="h-5 w-5" />} gradient="from-pink-500 to-rose-600" />}
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Task trend</CardTitle>
            <span className="text-xs text-muted-foreground">{period} · created vs completed</span>
          </CardHeader>
          <CardContent>
            {trendData.length ? (
              <TrendChart data={trendData} xKey="label" series={[{ key: 'Created', color: '#8b5cf6', name: 'Created' }, { key: 'Done', color: '#22c55e', name: 'Done' }]} />
            ) : <EmptyState title="No data yet" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={statusData} centerLabel={`${s.total || 0}`} />
            <div className="mt-3 space-y-1.5">
              {statusData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {isManager ? (
          <>
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Top performers</CardTitle>
                <Link href="/leaderboard" className="text-xs text-primary hover:underline">View all</Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {(ranking || []).slice(0, 5).map((e: any, i: number) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <span className="w-5 text-sm font-bold text-muted-foreground">#{i + 1}</span>
                    <Avatar name={e.name} src={e.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.department} · {e.done} done</p>
                    </div>
                    <span className="text-sm font-bold">{e.overall}</span>
                  </div>
                ))}
                {!ranking?.length && <EmptyState title="No rankings yet" />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department workload</CardTitle>
              </CardHeader>
              <CardContent>
                {deptData.length ? (
                  <DonutChart data={(deptLoad || []).map((d: any) => ({ name: d.name, value: d.tasksInPeriod, color: d.color || '#8b5cf6' }))} />
                ) : <EmptyState title="No department data" />}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Today's tasks</CardTitle>
              <Link href="/tasks" className="flex items-center gap-1 text-xs text-primary hover:underline">All tasks <ArrowRight className="h-3 w-3" /></Link>
            </CardHeader>
            <CardContent>
              {todayTasks.length === 0 ? (
                <EmptyState title="No tasks for today" description="Add a task to start tracking your creative work." />
              ) : (
                <div className="space-y-2">
                  {todayTasks.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-xl border p-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${STATUS_META[t.status as keyof typeof STATUS_META].dot}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.taskName}</p>
                        <p className="text-xs text-muted-foreground">{t.client?.name || 'Internal'} · {t.taskType}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{t.estimatedTime}h</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(activity?.items || []).slice(0, 6).map((a: any) => (
              <div key={a.id} className="flex gap-3">
                <Avatar name={a.user?.name || a.userName} src={a.user?.avatar} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm leading-snug text-foreground">
                    <span className="font-medium">{a.user?.name || a.userName}</span>{' '}
                    <span className="text-muted-foreground">{a.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            ))}
            {!activity?.items?.length && <EmptyState title="No activity yet" />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}