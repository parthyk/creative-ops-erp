import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KpiService } from '../kpi/kpi.service';
import { Period, periodRange } from '../common/utils/dates';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private kpi: KpiService,
  ) {}

  async insights(period: Period = 'month') {
    const { from, to } = periodRange(period);
    const range = { gte: from, lte: to };

    const [users, tasks, board, clients, comments] = await Promise.all([
      this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        include: { department: { select: { name: true, color: true } } },
      }),
      this.prisma.task.findMany({
        where: { date: range },
        include: { employee: { select: { id: true, name: true } } },
      }),
      this.kpi.leaderboard(period, new Date(), 100),
      this.prisma.client.findMany({ include: { _count: { select: { tasks: true } }, tasks: { where: { date: range } } } }),
      this.prisma.taskComment.count({ where: { task: { date: range } } }),
    ]);

    // Per-user load
    const perUser = new Map<string, { open: number; done: number; delayed: number; actualHours: number; estHours: number }>();
    for (const t of tasks) {
      const e = perUser.get(t.employeeId) || { open: 0, done: 0, delayed: 0, actualHours: 0, estHours: 0 };
      if (['TODO', 'IN_PROGRESS', 'IN_REVIEW'].includes(t.status)) e.open++;
      if (t.status === 'DONE') e.done++;
      if (t.status === 'DELAYED') e.delayed++;
      e.actualHours += t.actualTime;
      e.estHours += t.estimatedTime;
      perUser.set(t.employeeId, e);
    }

    const daysInPeriod = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
    const capacityFactor = 0.6;

    const enriched = users.map((u) => {
      const s = perUser.get(u.id) || { open: 0, done: 0, delayed: 0, actualHours: 0, estHours: 0 };
      const capacity = Math.round(u.workingHoursPerDay * daysInPeriod * capacityFactor);
      const load = capacity === 0 ? 0 : Math.round(((s.open * 1.5 + s.estHours) / capacity) * 100);
      const entry = board.find((b: any) => b.id === u.id);
      return { ...u, stats: s, capacity, loadPct: load, overall: entry?.overall ?? 0 };
    });

    const overloaded = enriched
      .filter((e) => e.loadPct > 100 || e.stats.open > 8)
      .sort((a, b) => b.loadPct - a.loadPct)
      .map((e) => ({ id: e.id, name: e.name, loadPct: e.loadPct, openTasks: e.stats.open }));

    const underutilized = enriched
      .filter((e) => e.loadPct < 30 && e.stats.done < Math.max(1, Math.round(daysInPeriod / 5)))
      .sort((a, b) => a.loadPct - b.loadPct)
      .map((e) => ({ id: e.id, name: e.name, loadPct: e.loadPct, done: e.stats.done }));

    const mostProductive = [...board].sort((a: any, b: any) => b.done - a.done).slice(0, 3)
      .map((e: any) => ({ id: e.id, name: e.name, done: e.done, overall: e.overall }));

    const slowestDelivery = [...enriched]
      .filter((e) => e.stats.done > 0)
      .sort((a, b) => (a.stats.actualHours / a.stats.done) - (b.stats.actualHours / b.stats.done))
      .reverse()
      .slice(0, 3)
      .map((e) => ({ id: e.id, name: e.name, avgHoursPerTask: Math.round((e.stats.actualHours / e.stats.done) * 10) / 10, done: e.stats.done }));

    const delayedClients = clients
      .filter((c) => c.tasks.some((t) => t.status === 'DELAYED'))
      .map((c) => ({
        id: c.id,
        name: c.name,
        totalTasks: c._count.tasks,
        delayed: c.tasks.filter((t) => t.status === 'DELAYED').length,
      }))
      .sort((a, b) => b.delayed - a.delayed);

    // Workload prediction: extrapolate next 7 days based on recent daily creation rate
    const recent7 = tasks.filter((t) => t.date >= new Date(Date.now() - 7 * 86400000)).length;
    const dailyRate = recent7 / 7;
    const predictedNext7 = Math.round(dailyRate * 7);
    const teamEfficiency = tasks.length === 0 ? 0 : Math.round((tasks.filter((t) => t.status === 'DONE').length / tasks.length) * 100);

    // Suggested redistribution
    const suggestions = this.buildSuggestions(overloaded, underutilized, enriched);

    return {
      generatedAt: new Date(),
      period,
      headline: {
        teamEfficiency,
        predictedTasksNext7Days: predictedNext7,
        dailyCreationRate: Math.round(dailyRate * 10) / 10,
        commentsExchanged: comments,
      },
      mostProductive,
      slowestDelivery,
      overloaded,
      underutilized,
      delayedClients,
      workloadPrediction: {
        next7Days: predictedNext7,
        method: 'linear extrapolation from last 7 days',
      },
      suggestions,
    };
  }

  private buildSuggestions(overloaded: any[], underutilized: any[], all: any[]) {
    const suggestions: { type: string; title: string; description: string; from?: string; to?: string }[] = [];
    const pairs = Math.min(overloaded.length, underutilized.length);
    for (let i = 0; i < pairs; i++) {
      suggestions.push({
        type: 'REDISTRIBUTE',
        title: `Balance load between ${overloaded[i].name} and ${underutilized[i].name}`,
        description: `${overloaded[i].name} is at ${overloaded[i].loadPct}% load while ${underutilized[i].name} is at ${underutilized[i].loadPct}%. Consider moving 2-3 tasks.`,
        from: overloaded[i].name,
        to: underutilized[i].name,
      });
    }
    if (!suggestions.length) {
      suggestions.push({
        type: 'HEALTHY',
        title: 'Workload is well balanced',
        description: 'No significant overload or under-utilisation detected in this period.',
      });
    }
    return suggestions;
  }

  async dailySummary() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);

    const [tasks, done, clientsWorked, users] = await Promise.all([
      this.prisma.task.findMany({ where: { date: { gte: start, lt: end } }, include: { employee: { select: { name: true } }, client: { select: { name: true } } } }),
      this.prisma.task.count({ where: { date: { gte: start, lt: end }, status: 'DONE' } }),
      this.prisma.task.findMany({ where: { date: { gte: start, lt: end }, clientId: { not: null } }, select: { client: { select: { name: true } } }, distinct: ['clientId'] }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
    ]);

    const byType: Record<string, number> = {};
    for (const t of tasks) byType[t.taskType] = (byType[t.taskType] || 0) + 1;

    const highlights = tasks.filter((t) => t.status === 'DONE').slice(0, 5).map((t) => `${t.taskName} (${t.client?.name || 'internal'})`);

    return {
      date: start,
      totalTasks: tasks.length,
      completed: done,
      activeEmployees: users,
      clientsWorked: [...new Set(clientsWorked.map((c) => c.client?.name).filter(Boolean))],
      byType,
      highlights,
    };
  }

  async monthlyReport(period: Period = 'month') {
    const { from, to } = periodRange(period);
    const [total, done, delayed, users, kpiTeam, board, clientsCount] = await Promise.all([
      this.prisma.task.count({ where: { date: { gte: from, lte: to } } }),
      this.prisma.task.count({ where: { date: { gte: from, lte: to }, status: 'DONE' } }),
      this.prisma.task.count({ where: { date: { gte: from, lte: to }, status: 'DELAYED' } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.kpi.teamKpi(period),
      this.kpi.leaderboard(period, new Date(), 5),
      this.prisma.client.count(),
    ]);

    return {
      period,
      overview: { total, done, delayed, activeUsers: users, clients: clientsCount, completionRate: total === 0 ? 0 : Math.round((done / total) * 100) },
      teamKpi: kpiTeam,
      topPerformers: board.map((e: any) => ({ name: e.name, score: e.overall, done: e.done })),
      summary: `The team completed ${done} of ${total} tasks (${total === 0 ? 0 : Math.round((done / total) * 100)}%). Overall KPI score is ${kpiTeam.overall}. ${delayed} tasks were delayed.`,
    };
  }
}
