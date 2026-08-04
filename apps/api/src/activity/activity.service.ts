import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async feed(query: { limit?: string; page?: string }, userId: string, role: string) {
    const limit = query.limit ? parseInt(query.limit, 10) : 30;
    const page = query.page ? parseInt(query.page, 10) : 1;
    const where = role === 'MANAGER' ? {} : { userId };

    const [items, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.activity.count({ where }),
    ]);

    return { items, total };
  }
}