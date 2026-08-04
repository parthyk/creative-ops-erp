import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { KpiService } from '../kpi/kpi.service';
import { Period, periodRange } from '../common/utils/dates';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private kpi: KpiService,
  ) {}

  async summary(period: Period = 'month', scope: { userId?: string; role?: string } = {}) {
    const cacheKey = `dash:${period}:${scope.userId || 'org'}:${Date.now() % 300}`;
    const { from, to } = periodRange(period);
    const range = { gte: from, lte: to };
    const employeeWhere = scope.role !== 'MANAGER' ? { employeeId: scope.userId } : {};

    const [tasks, doneTasks, activeUsers, departments, attendanceRows, holidays] = await Promise.all([
      this.prisma.task.findMany({
        where: { ...employeeWhere, date: range },
        select: { id: true, status: true, actualTime: true, estimatedTime: true, dueDate: true, completedAt: true },
      }),
      this.prisma.task.findMany({
        where: { ...employeeWhere, date: range, status: 'DONE' },
        select: { actualTime: true, completedAt: true, date: true, dueDate: true },
      }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.department.findMany({ include: { _count: { select: { tasks: true, users: true } } } }),
      this.prisma.attendance.findMany({ where: { ...(scope.role !== 'MANAGER' ? { employeeId: scope.userId } : {}), date: range } }),
      this.prisma.holiday.count({ where: { date: range } }),
    ]);

    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const pending = tasks.filter((t) => ['TODO', 'IN_PROGRESS', 'IN_REVIEW'].includes(t.status)).length;
    const delayed = tasks.filter((t) => t.status === 'DELAYED').length;
    const productivity = total === 0 ? 0 : Math.round((done / total) * 100);
    const totalEstTime = tasks.reduce((s, t) => s + t.estimatedTime, 0);
    const totalActualTime = tasks.reduce((s, t) => s + t.actualTime, 0);
    const utilization = totalEstTime === 0 ? 0 : Math.min(100, Math.round((totalEstTime / (totalEstTime + Math.max(0, totalActualTime - totalEstTime))) * 100));

    const delivered = doneTasks.filter((t) => {
      if (!t.dueDate) return true;
      return t.completedAt && t.completedAt <= t.dueDate;
    }).length;
    const onTimeRate = done === 0 ? 0 : Math.round((delivered / done) * 100);

    const avgDeliveryHours = doneTasks.length === 0 ? 0 : Math.round((doneTasks.reduce((s, t) => s + t.actualTime, 0) / doneTasks.length) * 10) / 10;
    const workHours = Math.round(totalActualTime * 10) / 10;

    const presentDays = attendanceRows.filter((a) => ['PRESENT', 'HALF_DAY'].includes(a.status));
    const attendanceRate = attendanceRows.length === 0 ? 100 : Math.round((presentDays.length / attendanceRows.length) * 100);

    const kpiOverall = scope.role === 'MANAGER'
      ? (await this.kpi.teamKpi(period)).overall
      : (await this.kpi.employeeKpi(scope.userId!, period)).overall;

    return {
      scope: scope.role === 'MANAGER' ? 'org' : 'self',
      period,
      total,
      done,
      pending,
      delayed,
      productivity,
      utilization,
      onTimeRate,
      avgDeliveryHours,
      workHours,
      attendanceRate,
      kpiOverall,
      activeEmployeeCount: activeUsers,
      holidayCount: holidays,
      departments,
    };
  }

  async employeeRanking(period: Period = 'month', limit = 8) {
    return this.kpi.leaderboard(period, new Date(), limit);
  }

  async monthlyGrowth() {
    const now = new Date();
    const month = periodRange('month', now);
    const lastMonth = periodRange('month', new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const [cur, prev] = await Promise.all([
      this.prisma.task.count({ where: { status: 'DONE', date: { gte: month.from, lte: month.to } } }),
      this.prisma.task.count({ where: { status: 'DONE', date: { gte: lastMonth.from, lte: lastMonth.to } } }),
    ]);
    const growth = prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
    return { current: cur, previous: prev, growth };
  }

  async taskTrend(period: Period = 'month', userId?: string, role?: string) {
    const days: { label: string; date: Date; done: number; created: number }[] = [];
    const now = new Date();
    const count = period === 'week' ? 7 : period === 'month' ? 30 : 12;
    const where = role !== 'MANAGER' && userId ? { employeeId: userId } : {};
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const label = period === 'year' ? `${d.getFullYear()}` : d.toISOString().slice(0, 10);
      const from = i < count && count === 12 ? new Date(d.getFullYear() - 1, d.getMonth(), 1) : new Date(d);
      const span = { gte: new Date(from.getFullYear(), from.getMonth(), from.getDate()), lte: new Date(from.getFullYear(), from.getMonth(), from.getDate(), 23, 59, 59) };
      days.push({ label, date: d, done: 0, created: 0 });
    }
    const tasks = await this.prisma.task.findMany({ where: { ...where, date: { gte: days[0].date } }, select: { date: true, status: true } });
    for (const t of tasks) {
      const label = t.date.toISOString().slice(0, 10);
      const slot = days.find((d) => d.date.toISOString().slice(0, 10) === label) || days[days.length - 1];
      slot.created++;
      if (t.status === 'DONE') slot.done++;
    }
    return days;
  }

  async departmentLoad(period: Period = 'month', role?: string, userId?: string) {
    const { from, to } = periodRange(period);
    const deps = await this.prisma.department.findMany({
      include: {
        _count: { select: { tasks: true, users: true } },
        tasks: { where: { date: { gte: from, lte: to }, ...(role !== 'MANAGER' ? { employeeId: userId } : {}) } },
      },
    });
    return deps.map((d) => ({
      name: d.name,
      color: d.color,
      employees: d._count.users,
      tasksInPeriod: d.tasks.length,
      done: d.tasks.filter((t) => t.status === 'DONE').length,
    }));
  }
}