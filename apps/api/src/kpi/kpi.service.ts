import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Period, periodRange } from '../common/utils/dates';

export interface KpiScales {
  onTime: number;
  productivity: number;
  quality: number;
  revision: number;
  satisfaction: number;
  creativity: number;
  attendance: number;
  collaboration: number;
}

const DEFAULT_WEIGHTS: Record<keyof KpiScales, number> = {
  onTime: 25,
  productivity: 20,
  quality: 20,
  revision: 10,
  satisfaction: 10,
  creativity: 5,
  attendance: 5,
  collaboration: 5,
};

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 100) / 100));

@Injectable()
export class KpiService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private async weights(): Promise<Record<keyof KpiScales, number>> {
    const configs = await this.prisma.kpiConfig.findMany();
    if (!configs.length) return DEFAULT_WEIGHTS;
    const map: any = {};
    for (const c of configs) map[c.key] = c.weight;
    return { ...DEFAULT_WEIGHTS, ...map };
  }

  private async baseMetrics(userId: string, period: Period, ref = new Date()) {
    const { from, to } = periodRange(period, ref);
    const range = { gte: from, lte: to };

    const [tasks, doneTasks, delayedCount, comments, attendance, user, clientTasks] =
      await Promise.all([
        this.prisma.task.findMany({
          where: { employeeId: userId, date: range },
          select: {
            id: true, status: true, dueDate: true, estimatedTime: true, actualTime: true,
            revisionCount: true, completedAt: true, taskType: true, createdAt: true,
            client: { select: { id: true } },
          },
        }),
        this.prisma.task.findMany({
          where: { employeeId: userId, date: range, status: 'DONE' },
          select: {
            dueDate: true, completedAt: true, actualTime: true, estimatedTime: true,
            revisionCount: true, taskType: true, id: true,
          },
        }),
        this.prisma.task.count({ where: { employeeId: userId, date: range, status: 'DELAYED' } }),
        this.prisma.taskComment.count({ where: { task: { employeeId: userId, date: range } } }),
        this.prisma.attendance.findMany({ where: { employeeId: userId, date: range } }),
        this.prisma.user.findUnique({ where: { id: userId }, select: { workingHoursPerDay: true, joinedAt: true } }),
        this.prisma.task.findMany({
          where: { employeeId: userId, date: range, clientId: { not: null } },
          select: { clientId: true, status: true, dueDate: true, completedAt: true },
        }),
      ]);

    const total = tasks.length;
    const done = doneTasks.length;
    const pending = tasks.filter((t) => ['TODO', 'IN_PROGRESS', 'IN_REVIEW'].includes(t.status)).length;

    return { tasks, doneTasks, done, pending, delayedCount, total, comments, attendance, workingDays: user?.workingHoursPerDay || 8, clientTasks };
  }

  async employeeKpi(userId: string, period: Period = 'month', ref = new Date()) {
    const cacheKey = `kpi:emp:${userId}:${period}:${ref.toISOString().slice(0, 10)}`;
    return this.redis.cached(cacheKey, async () => {
      const m = await this.baseMetrics(userId, period, ref);
      const weights = await this.weights();

      // On-time: completed by due date (or same day if no due date)
      const onTimeCount = m.doneTasks.filter((t) => {
        if (!t.dueDate) return true;
        return t.completedAt && t.completedAt <= t.dueDate;
      }).length;
      const onTime = m.done === 0 ? (m.total === 0 ? 100 : 0) : (onTimeCount / m.done) * 100;

      // Productivity: tasks completed vs expected load (estimate: 3 tasks/day * working days in period)
      const workingDaysInPeriod = Math.max(1, Math.round((periodRange(period, ref).to.getTime() - periodRange(period, ref).from.getTime()) / 86400000));
      const expected = Math.max(1, workingDaysInPeriod * 2.5);
      const productivity = clamp((m.done / expected) * 100);

      // Quality: completed tasks with 0 revisions
      const noRevision = m.doneTasks.filter((t) => t.revisionCount === 0).length;
      const quality = m.done === 0 ? (m.total === 0 ? 100 : 0) : (noRevision / m.done) * 100;

      // Revision (lower better)
      const revisionRate = m.done === 0 ? 0 : m.doneTasks.reduce((s, t) => s + t.revisionCount, 0) / m.done;
      const revision = clamp(100 * Math.exp(-revisionRate));

      // Client satisfaction: share of client tasks completed on-time
      const clientDone = m.clientTasks.filter((t) => t.status === 'DONE').length;
      const clientOnTime = m.clientTasks.filter((t) => t.status === 'DONE' && (!t.dueDate || (t.completedAt && t.completedAt <= t.dueDate))).length;
      const satisfaction = clientDone === 0 ? (m.clientTasks.length === 0 ? 85 : 0) : (clientOnTime / clientDone) * 100;

      // Creativity: variety + premium task types
      const premium = m.doneTasks.filter((t) => ['Video', 'Animation', 'Packaging', 'Illustration', 'UiDesign', 'LandingPage', 'Creative'].includes(t.taskType)).length;
      const creativity = m.done === 0 ? 0 : clamp(60 + (premium / m.done) * 40 + Math.min(20, new Set(m.doneTasks.map((t) => t.taskType)).size * 5));

      // Attendance
      const days = m.attendance.length || 1;
      const present = m.attendance.filter((a) => ['PRESENT', 'HALF_DAY'].includes(a.status)).length;
      const attendance = m.attendance.length === 0 ? 100 : (present / days) * 100;

      // Collaboration: comments + reassigned
      const collaboration = clamp(Math.min(100, (m.comments / Math.max(1, m.done)) * 25 + 40));

      const scales: KpiScales = {
        onTime: clamp(onTime),
        productivity,
        quality: clamp(quality),
        revision,
        satisfaction: clamp(satisfaction),
        creativity,
        attendance: clamp(attendance),
        collaboration,
      };

      const overall = clamp(
        Object.keys(scales).reduce((sum, k) => sum + scales[k as keyof KpiScales] * (weights[k as keyof KpiScales] / 100), 0),
      );

      const rank = await this.rankOf(userId, period, ref);

      return {
        userId,
        period,
        scores: scales,
        weights,
        overall,
        rank,
        summary: { total: m.total, done: m.done, pending: m.pending, delayed: m.delayedCount },
        label: this.grade(overall),
      };
    }, 300);
  }

  private async rankOf(userId: string, period: Period, ref: Date) {
    const board = await this.leaderboard(period, ref);
    const idx = board.findIndex((e: any) => e.id === userId);
    return idx >= 0 ? idx + 1 : null;
  }

  async leaderboard(period: Period = 'month', ref = new Date(), limit = 20) {
    const cacheKey = `kpi:board:${period}:${ref.toISOString().slice(0, 10)}`;
    return this.redis.cached(cacheKey, async () => {
      const users = await this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        include: { department: { select: { name: true, color: true } } },
      });
      const rows = await Promise.all(
        users.map(async (u) => {
          const kpi = await this.employeeKpiRaw(u.id, period, ref);
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            avatar: u.avatar,
            department: u.department?.name || '—',
            departmentColor: u.department?.color || null,
            designation: u.designation,
            overall: kpi.overall,
            scores: kpi.scores,
            done: kpi.summary.done,
            total: kpi.summary.total,
            delayed: kpi.summary.delayed,
          };
        }),
      );
      rows.sort((a, b) => b.overall - a.overall);
      return rows.slice(0, limit);
    }, 300);
  }

  private async employeeKpiRaw(userId: string, period: Period, ref: Date) {
    // same computation without caching/rank to avoid recursion
    const m = await this.baseMetrics(userId, period, ref);
    const weights = await this.weights();
    const onTimeCount = m.doneTasks.filter((t) => {
      if (!t.dueDate) return true;
      return t.completedAt && t.completedAt <= t.dueDate;
    }).length;
    const onTime = m.done === 0 ? (m.total === 0 ? 100 : 0) : (onTimeCount / m.done) * 100;
    const workingDaysInPeriod = Math.max(1, Math.round((periodRange(period, ref).to.getTime() - periodRange(period, ref).from.getTime()) / 86400000));
    const expected = Math.max(1, workingDaysInPeriod * 2.5);
    const productivity = clamp((m.done / expected) * 100);
    const noRevision = m.doneTasks.filter((t) => t.revisionCount === 0).length;
    const quality = m.done === 0 ? (m.total === 0 ? 100 : 0) : (noRevision / m.done) * 100;
    const revisionRate = m.done === 0 ? 0 : m.doneTasks.reduce((s, t) => s + t.revisionCount, 0) / m.done;
    const revision = clamp(100 * Math.exp(-revisionRate));
    const clientDone = m.clientTasks.filter((t) => t.status === 'DONE').length;
    const clientOnTime = m.clientTasks.filter((t) => t.status === 'DONE' && (!t.dueDate || (t.completedAt && t.completedAt <= t.dueDate))).length;
    const satisfaction = clientDone === 0 ? (m.clientTasks.length === 0 ? 85 : 0) : (clientOnTime / clientDone) * 100;
    const premium = m.doneTasks.filter((t) => ['Video', 'Animation', 'Packaging', 'Illustration', 'UiDesign', 'LandingPage', 'Creative'].includes(t.taskType)).length;
    const creativity = m.done === 0 ? 0 : clamp(60 + (premium / m.done) * 40 + Math.min(20, new Set(m.doneTasks.map((t) => t.taskType)).size * 5));
    const days = m.attendance.length || 1;
    const present = m.attendance.filter((a) => ['PRESENT', 'HALF_DAY'].includes(a.status)).length;
    const attendance = m.attendance.length === 0 ? 100 : (present / days) * 100;
    const collaboration = clamp(Math.min(100, (m.comments / Math.max(1, m.done)) * 25 + 40));

    const scores: KpiScales = {
      onTime: clamp(onTime), productivity, quality: clamp(quality), revision,
      satisfaction: clamp(satisfaction), creativity, attendance: clamp(attendance), collaboration,
    };
    const overall = clamp(Object.keys(scores).reduce((sum, k) => sum + scores[k as keyof KpiScales] * (weights[k as keyof KpiScales] / 100), 0));
    return { scores, weights, overall, summary: { done: m.done, total: m.total, delayed: m.delayedCount, pending: m.pending } };
  }

  async teamKpi(period: Period = 'month', ref = new Date()) {
    const cacheKey = `kpi:team:${period}:${ref.toISOString().slice(0, 10)}`;
    return this.redis.cached(cacheKey, async () => {
      const board = await this.leaderboard(period, ref, 1000);
      const keys: (keyof KpiScales)[] = ['onTime', 'productivity', 'quality', 'revision', 'satisfaction', 'creativity', 'attendance', 'collaboration'];
      const averages: any = {};
      for (const k of keys) {
        averages[k] = Math.round((board.reduce((s, e: any) => s + (e.scores?.[k] ?? 0), 0) / Math.max(1, board.length)) * 100) / 100;
      }
      return {
        teamSize: board.length,
        averages,
        overall: Math.round(board.reduce((s, e: any) => s + e.overall, 0) / Math.max(1, board.length) * 100) / 100,
      };
    }, 300);
  }

  grade(overall: number) {
    if (overall >= 100) return 'Excellent';
    if (overall >= 90) return 'Great';
    if (overall >= 80) return 'Good';
    if (overall >= 70) return 'Average';
    return 'Needs Improvement';
  }
}
