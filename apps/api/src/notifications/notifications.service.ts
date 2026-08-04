import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: { page?: number; perPage?: number; unread?: string }) {
    const page = query.page ? parseInt(query.page as any, 10) : 1;
    const perPage = query.perPage ? parseInt(query.perPage as any, 10) : 20;
    const where = { userId, ...(query.unread === 'true' ? { read: false } : {}) };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);
    return { items, total, unread, page, perPage };
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }
}