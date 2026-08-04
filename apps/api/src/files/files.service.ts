import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async upload(
    file: { originalname: string; buffer: Buffer; mimetype: string },
    metadata: { folder?: string; clientId?: string; taskId?: string },
    userId: string,
  ) {
    const folder = metadata.folder || 'General';
    const { url, key } = await this.storage.save(file, folder);

    const record = await this.prisma.fileAsset.create({
      data: {
        name: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.buffer.length,
        url,
        key,
        folder,
        clientId: metadata.clientId || null,
        taskId: metadata.taskId || null,
        uploadedById: userId,
      },
    });

    this.prisma.activity.create({
      data: {
        userId,
        action: 'File uploaded',
        entityType: 'FileAsset',
        entityId: record.id,
        meta: { name: file.originalname, folder },
      },
    });

    return record;
  }

  async findAll(query: { folder?: string; clientId?: string; search?: string }) {
    return this.prisma.fileAsset.findMany({
      where: {
        ...(query.folder ? { folder: query.folder } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.search
          ? { name: { contains: query.search, mode: 'insensitive' as const } }
          : {}),
      },
      include: {
        uploadedBy: { select: { id: true, name: true, avatar: true } },
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async folders() {
    const result = await this.prisma.fileAsset.groupBy({ by: ['folder'], _count: { _all: true } });
    return result.map((r) => ({ name: r.folder, count: r._count._all }));
  }

  async remove(id: string) {
    const file = await this.prisma.fileAsset.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    await this.storage.remove(file.key || '');
    await this.prisma.fileAsset.delete({ where: { id } });
    return { success: true };
  }
}