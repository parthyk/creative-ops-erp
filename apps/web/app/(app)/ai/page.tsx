'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Award, Timer, AlertTriangle, UserX, Briefcase, TrendingUp,
  GitCompareArrows, Brain, MessageSquare, CalendarClock,
} from 'lucide-react';
import { useFetch } from '@/lib/hooks';
import { useAuth } from '@/lib/auth';
import { PageHeader, Loading } from '@/components/shared/common';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const PERIODS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
];

export default function AiPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const { data: insights, loading } = useFetch<any>(`/ai/insights?period=${period}`);
  const { data: summary } = useFetch<any>('/ai/summary');
  const { data: report } = useFetch<any>('/ai/report?period=month');

  if (loading) return <Loading label="Running analysis…" />;

  const h = insights?.headline || {};
  const periodLabel = period === 'week' ? 'this week' : period === 'quarter' ? 'this quarter' : 'this month';

  return (
    <div className="space-y-6">
      <PageHeader
        title={<span className="flex items-center gap-2"><Brain className="h-6 w-6 text-primary" /> AI Insights</span>}
        description="Workload analysis, predictions and redistribution suggestions"
      >
        <Tabs value={period} onChange={setPeriod} tabs={PERIODS} />
      </PageHeader>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Team efficiency" value={`${h.teamEfficiency ?? 0}%`} gradient="from-violet-500 to-indigo-600" />
        <MetricCard icon={<CalendarClock className="h-5 w-5" />} label="Predicted tasks · next 7d" value={h.predictedTasksNext7Days ?? 0} gradient="from-blue-500 to-sky-600" />
        <MetricCard icon={<Sparkles className="h-5 w-5" />} label="Daily creation rate" value={h.dailyCreationRate ?? 0} gradient="from-amber-500 to-orange-600" />
        <MetricCard icon={<MessageSquare className="h-5 w-5" />} label="Comments exchanged" value={h.commentsExchanged ?? 0} gradient="from-emerald-500 to-teal-600" />
      </div>

      {/* Most productive + slowest */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Award className="h-4 w-4 text-amber-500" /> Most productive</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(insights?.mostProductive || []).map((e: any, i: number) => (
              <PersonRow key={e.id} name={e.name} meta={`${e.done} tasks done`} score={e.overall} icon={<Award className="h-4 w-4 text-amber-500" />} rank={i + 1} />
            ))}
            {!insights?.mostProductive?.length && <p className="text-sm text-muted-foreground">No data for {periodLabel}.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Timer className="h-4 w-4 text-sky-500" /> Slowest delivery</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(insights?.slowestDelivery || []).map((e: any, i: number) => (
              <PersonRow key={e.id} name={e.name} meta={`${e.avgHoursPerTask}h avg per task`} score={e.avgHoursPerTask} icon={<Timer className="h-4 w-4 text-sky-500" />} rank={i + 1} />
            ))}
            {!insights?.slowestDelivery?.length && <p className="text-sm text-muted-foreground">No completed tasks for {periodLabel}.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Overloaded / underutilized */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Overloaded employees</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(insights?.overloaded || []).map((e: any) => (
              <div key={e.id} className="flex items-center gap-3">
                <Badge variant="destructive">{e.loadPct}% load</Badge>
                <span className="text-sm font-medium">{e.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{e.openTasks} open tasks</span>
              </div>
            ))}
            {!insights?.overloaded?.length && <p className="text-sm text-emerald-600">🎉 No one is overloaded.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><UserX className="h-4 w-4 text-blue-500" /> Underutilised employees</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(insights?.underutilized || []).map((e: any) => (
              <div key={e.id} className="flex items-center gap-3">
                <Badge variant="secondary">{e.loadPct}% load</Badge>
                <span className="text-sm font-medium">{e.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{e.done} done</span>
              </div>
            ))}
            {!insights?.underutilized?.length && <p className="text-sm text-muted-foreground">Everyone is well utilised.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Delayed clients */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-rose-500" /> Delayed clients</CardTitle></CardHeader>
        <CardContent>
          {insights?.delayedClients?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(insights.delayedClients as any[]).map((c) => (
                <div key={c.id} className="rounded-xl border p-4">
                  <p className="font-medium">{c.name}</p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delayed tasks</span>
                    <span className="font-bold text-red-500">{c.delayed}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total tasks</span>
                    <span className="font-semibold">{c.totalTasks}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-emerald-600">No delayed clients 🎉</p>
          )}
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><GitCompareArrows className="h-4 w-4 text-fuchsia-500" /> Suggested redistribution</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(insights?.suggestions || []).map((s: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border bg-gradient-to-r from-fuchsia-500/[0.06] to-violet-500/[0.06] p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* AI monthly report + daily summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI monthly report</CardTitle></CardHeader>
          <CardContent>
            {report ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-lg font-bold">{report.overview?.completionRate}%</p><p className="text-[11px] text-muted-foreground">Completion</p></div>
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-lg font-bold">{report.teamKpi?.overall}</p><p className="text-[11px] text-muted-foreground">Team KPI</p></div>
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-lg font-bold">{report.overview?.delayed}</p><p className="text-[11px] text-muted-foreground">Delayed</p></div>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Generating…</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-emerald-500" /> Today's summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {summary && (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-lg font-bold">{summary.totalTasks}</p><p className="text-[11px] text-muted-foreground">Tasks</p></div>
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-lg font-bold">{summary.completed}</p><p className="text-[11px] text-muted-foreground">Completed</p></div>
                  <div className="rounded-xl bg-muted/50 p-3"><p className="text-lg font-bold">{summary.activeEmployees}</p><p className="text-[11px] text-muted-foreground">Active</p></div>
                </div>
                {summary.clientsWorked?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Clients worked on</p>
                    <div className="flex flex-wrap gap-1.5">
                      {summary.clientsWorked.map((c: string) => <Badge key={c} variant="secondary">{c}</Badge>)}
                    </div>
                  </div>
                )}
                {summary.highlights?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Highlights</p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {summary.highlights.map((h2: string) => <li key={h2}>{h2}</li>)}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: React.ReactNode; gradient: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white', gradient)}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </motion.div>
  );
}

function PersonRow({ name, meta, score, icon, rank }: { name: string; meta: string; score: number; icon: React.ReactNode; rank: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-sm font-bold text-muted-foreground">#{rank}</span>
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      {icon}
      <span className="font-semibold">{score}</span>
    </div>
  );
}