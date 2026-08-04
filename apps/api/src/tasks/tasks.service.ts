import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import {
  AddCommentDto,
  CreateTaskDto,
  ReassignTaskDto,
  UpdateTaskDto,
} from './dto/tasks.dto';
import { RedisService } from '../redis/redis.service';

const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DELAYED', 'DONE', 'CANCELLED'];

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private redis: RedisService,
  ) {}

  async create(dto: CreateTaskDto, actorId: string, actorName: string, actorRole: string) {
    const isManager = actorRole === 'MANAGER';
    const employeeId = isManager && dto.employeeId ? dto.employeeId : actorId;

    const task = await this.prisma.task.create({
      data: {
        date: dto.date ? new Date(dto.date) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        taskType: dto.taskType,
        taskName: dto.taskName,
        description: dto.description,
        priority: dto.priority || 'MEDIUM',
        status: dto.status || 'TODO',
        estimatedTime: dto.estimatedTime ?? 1,
        actualTime: dto.actualTime ?? 0,
        taskCount: dto.taskCount ?? 1,
        attachments: dto.attachments ? (dto.attachments as any) : undefined,
        clientId: dto.clientId || null,
        departmentId: dto.departmentId || null,
        employeeId,
        reviewerId: dto.reviewerId || null,
        assignedById: isManager ? actorId : null,
      },
      include: {
        client: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true, avatar: true } },
        department: { select: { id: true, name: true } },
      },
    });

    await this.audit(actorId, `${actorName} created a task`, 'Task', task.id, {
      task: task.taskName,
      client: task.client?.name,
    });

    if (isManager && dto.employeeId && dto.employeeId !== actorId) {
      await this.notify(dto.employeeId, 'ASSIGNMENT', 'New task assigned',
        `"${task.taskName}" was assigned to you`, { taskId: task.id, clientId: task.clientId });
      this.events.emitToUser(dto.employeeId, 'task.assigned', { taskId: task.id });
    }
    this.events.emitToAll('task.created', { taskId: task.id });

    await this.redis.invalidate('dash');
    await this.redis.invalidate('kpi');
    return task;
  }

  async findAll(query: {
    from?: string;
    to?: string;
    date?: string;
    status?: string;
    priority?: string;
    clientId?: string;
    departmentId?: string;
    employeeId?: string;
    taskType?: string;
    search?: string;
    page?: number;
    perPage?: number;
    myOnly?: string;
    includeCompleted?: string;
  }, userId: string, role: string) {
    const {
      from, to, date, status, priority, clientId, departmentId, employeeId,
      taskType, search, myOnly, includeCompleted,
    } = query;
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 50;

    const where: Prisma.TaskWhereInput = {
      ...(status ? { status: status as any } : {}),
      ...(priority ? { priority: priority as any } : {}),
      ...(clientId ? { clientId } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(taskType ? { taskType: taskType as any } : {}),
      ...(search
        ? {
            OR: [
              { taskName: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(date ? { date: { gte: startOfDay(new Date(date)), lt: endOfDay(new Date(date)) } } : {}),
      ...(from && to ? { date: { gte: new Date(from), lte: new Date(to) } } : {}),
    };

    if (myOnly === 'true' || role !== 'MANAGER') {
      where.employeeId = userId;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (includeCompleted !== 'true') {
      where.status = { not: 'CANCELLED' };
    }

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, brandColors: true } },
          employee: { select: { id: true, name: true, avatar: true } },
          department: { select: { id: true, name: true, color: true } },
          reviewer: { select: { id: true, name: true } },
          comments: { include: { author: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'asc' } },
          _count: { select: { files: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, page, perPage };
  }

  async kanban(query: Record<string, any>, userId: string, role: string) {
    const list = await this.findAll({ ...query, perPage: 500 }, userId, role);
    const columns = TASK_STATUSES.map((status) => ({
      status,
      items: list.items.filter((t: any) => t.status === status),
    }));
    return columns;
  }

  async findOne(id: string, userId: string, role: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, brandColors: true, priority: true } },
        employee: { select: { id: true, name: true, avatar: true, designation: true, department: { select: { name: true } } } },
        department: { select: { id: true, name: true, color: true } },
        reviewer: { select: { id: true, name: true } },
        assignedBy: { select: { id: true, name: true } },
        comments: { include: { author: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'asc' } },
        assignments: {
          include: { from: { select: { id: true, name: true } }, to: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        files: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (role !== 'MANAGER' && task.employeeId !== userId) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, actorId: string, actorName: string) {
    const existing = await this.ensure(id);
    const data: Prisma.TaskUpdateInput = {};
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.taskType !== undefined) data.taskType = dto.taskType;
    if (dto.taskName !== undefined) data.taskName = dto.taskName;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.estimatedTime !== undefined) data.estimatedTime = dto.estimatedTime;
    if (dto.actualTime !== undefined) data.actualTime = dto.actualTime;
    if (dto.taskCount !== undefined) data.taskCount = dto.taskCount;
    if (dto.revisionCount !== undefined) data.revisionCount = dto.revisionCount;
    if (dto.clientId !== undefined) data.client = dto.clientId ? { connect: { id: dto.clientId } } : { disconnect: true };
    if (dto.departmentId !== undefined) data.department = dto.departmentId ? { connect: { id: dto.departmentId } } : { disconnect: true };
    if (dto.reviewerId !== undefined) data.reviewer = dto.reviewerId ? { connect: { id: dto.reviewerId } } : { disconnect: true };

    if (dto.status !== undefined && dto.status !== existing.status) {
      data.status = dto.status;
      if (dto.status === 'DONE' && !existing.completedAt) {
        data.completedAt = new Date();
        if (!dto.actualTime && existing.actualTime <= 0) data.actualTime = dto.actualTime || 0;
      } else if (dto.status !== 'DONE') {
        data.completedAt = null;
      }
      await this.audit(actorId, `${actorName} moved "${existing.taskName}" to ${dto.status.replace(/_/g, ' ').toLowerCase()}`, 'Task', id, {
        status: dto.status,
      });
      this.events.emitToUser(existing.employeeId, 'task.updated', { taskId: id, status: dto.status });
      this.events.emitToAll('task.updated', { taskId: id });
    }

    const task = await this.prisma.task.update({ where: { id }, data });
    await this.redis.invalidate('dash');
    await this.redis.invalidate('kpi');
    return task;
  }

  async changeStatus(id: string, status: TaskStatus, actorId: string, actorName: string) {
    return this.update(id, { status }, actorId, actorName);
  }

  async remove(id: string, actorId: string, role: string, userId: string) {
    const existing = await this.ensure(id);
    if (role !== 'MANAGER' && existing.employeeId !== userId) {
      throw new NotFoundException('Task not found');
    }
    await this.prisma.task.delete({ where: { id } });
    await this.audit(actorId, 'Task deleted', 'Task', id, { task: existing.taskName });
    await this.redis.invalidate('dash');
    await this.redis.invalidate('kpi');
    return { success: true };
  }

  async reassign(id: string, dto: ReassignTaskDto, actorId: string, actorName: string) {
    const existing = await this.ensure(id);
    const task = await this.prisma.task.update({
      where: { id },
      data: { employeeId: dto.toId },
      include: { client: { select: { name: true } } },
    });

    await this.prisma.taskAssignment.create({
      data: {
        taskId: id,
        fromId: existing.employeeId,
        toId: dto.toId,
        reason: dto.reason,
      },
    });

    await this.audit(actorId, `${actorName} reassigned "${existing.taskName}"`, 'Task', id, {
      from: existing.employeeId,
      to: dto.toId,
      reason: dto.reason,
    });

    await this.notify(dto.toId, 'ASSIGNMENT', 'Task reassigned',
      `"${existing.taskName}" was reassigned to you${task.client ? ` for ${task.client.name}` : ''}`, { taskId: id });
    this.events.emitToUser(dto.toId, 'task.assigned', { taskId: id });

    return task;
  }

  async addComment(id: string, dto: AddCommentDto, actorId: string, actorName: string) {
    const existing = await this.ensure(id);
    const comment = await this.prisma.taskComment.create({
      data: {
        taskId: id,
        authorId: actorId,
        body: dto.body,
        mentions: dto.mentions ? (dto.mentions as any) : undefined,
      },
      include: { author: { select: { id: true, name: true, avatar: true } } },
    });

    await this.audit(actorId, `${actorName} commented on "${existing.taskName}"`, 'Task', id, {});
    this.events.emitToUser(existing.employeeId, 'task.commented', { taskId: id });

    if (dto.mentions?.length) {
      for (const uid of dto.mentions) {
        await this.notify(uid, 'MENTION', `${actorName} mentioned you`,
          `in a comment on "${existing.taskName}"`, { taskId: id });
        this.events.emitToUser(uid, 'notification', { type: 'MENTION', taskId: id });
      }
    }
    return comment;
  }

  async myDay(userId: string, dateStr?: string) {
    const day = dateStr ? new Date(dateStr) : new Date();
    const where: Prisma.TaskWhereInput = {
      employeeId: userId,
      date: { gte: startOfDay(day), lt: endOfDay(day) },
    };
    const [all, done, pending, delayed] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, brandColors: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { priority: 'desc' },
      }),
      this.prisma.task.count({ where: { ...where, status: 'DONE' } }),
      this.prisma.task.count({ where: { ...where, status: { in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW'] } } }),
      this.prisma.task.count({ where: { ...where, status: 'DELAYED' } }),
    ]);

    return {
      items: all,
      summary: { total: all.length, done, pending, delayed },
    };
  }

  async calendarEvents(query: { from?: string; to?: string; userId?: string }, viewerId: string, role: string) {
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), 0, 1);
    const to = query.to ? new Date(query.to) : new Date(new Date().getFullYear() + 1, 0, 1);
    const where: Prisma.TaskWhereInput = {
      date: { gte: from, lte: to },
      ...(role !== 'MANAGER' || (query.userId && query.userId !== 'all') ? { employeeId: query.userId || viewerId } : {}),
    };
    const tasks = await this.prisma.task.findMany({
      where,
      select: {
        id: true, taskName: true, date: true, dueDate: true, status: true, priority: true,
        client: { select: { name: true } },
        employee: { select: { name: true } },
      },
    });
    return tasks;
  }

  async overdueSummary() {
    const todayStart = startOfDay(new Date());
    const [delayed, dueToday] = await Promise.all([
      this.prisma.task.count({ where: { status: 'DELAYED' } }),
      this.prisma.task.count({
        where: { dueDate: { gte: todayStart, lte: endOfDay(new Date()) }, status: { not: 'DONE' } },
      }),
    ]);
    return { delayed, dueToday };
  }

  private async ensure(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async notify(userId: string, type: any, title: string, message: string, meta: any) {
    await this.prisma.notification.create({ data: { userId, type, title, message, meta, ...(meta?.taskId ? { taskId: meta.taskId } : {}) } });
  }

  private async audit(userId: string, action: string, entity: string, entityId: string, meta: any) {
    await this.prisma.activity.create({ data: { userId, action, entityType: entity, entityId, meta } });
  }
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
