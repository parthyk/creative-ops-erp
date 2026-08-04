import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import {
  AssignStakeholderDto,
  CreateClientDto,
  UpdateClientDto,
} from './dto/clients.dto';
import { slugify } from './utils/slugify';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async create(dto: CreateClientDto, actorId: string) {
    const baseSlug = slugify(dto.name) || 'client';
    let slug = baseSlug;
    let n = 1;
    while (await this.prisma.client.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++n}`;
    }

    const client = await this.prisma.client.create({
      data: {
        name: dto.name,
        slug,
        logoUrl: dto.logoUrl,
        industry: dto.industry,
        website: dto.website,
        contractType: dto.contractType || 'RETAINER',
        priority: dto.priority || 'MEDIUM',
        status: dto.status || 'ACTIVE',
        brandColors: dto.brandColors ? (dto.brandColors as any) : undefined,
        fonts: dto.fonts ? (dto.fonts as any) : undefined,
        brandAssets: dto.brandAssets ? (dto.brandAssets as any) : undefined,
        description: dto.description,
      },
    });

    await this.audit(actorId, 'Client added', 'Client', client.id, { name: client.name });
    this.events.emitToAll('client.created', { id: client.id, name: client.name });

    return client;
  }

  async findAll(query: {
    search?: string;
    status?: string;
    priority?: string;
    contractType?: string;
    stakeholderId?: string;
    page?: number;
    perPage?: number;
  }) {
    const { search, status, priority, contractType, stakeholderId } = query;
    const page = Number(query.page) || 1;
    const perPage = Number(query.perPage) || 100;
    const where: Prisma.ClientWhereInput = {
      ...(status ? { status: status as any } : {}),
      ...(priority ? { priority: priority as any } : {}),
      ...(contractType ? { contractType: contractType as any } : {}),
      ...(stakeholderId
        ? { stakeholders: { some: { employeeId: stakeholderId, isActive: true } } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { industry: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: {
          stakeholders: { include: { employee: { select: { id: true, name: true, avatar: true } } } },
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.client.count({ where }),
    ]);

    return { items, total, page, perPage };
  }

  async findMine(employeeId: string) {
    const stakeholders = await this.prisma.stakeholder.findMany({
      where: { employeeId, isActive: true },
      include: {
        client: {
          include: {
            stakeholders: { include: { employee: { select: { id: true, name: true, avatar: true } } } },
            _count: { select: { tasks: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });
    return stakeholders.map((s) => ({ ...s.client, stakeholderRole: s.role }));
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        stakeholders: { include: { employee: { select: { id: true, name: true, avatar: true, designation: true } } } },
        stakeholderLogs: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { date: 'desc' },
          take: 50,
        },
        tasks: {
          include: { employee: { select: { id: true, name: true, avatar: true } } },
          orderBy: { date: 'desc' },
          take: 20,
        },
        _count: { select: { tasks: true, files: true } },
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(id: string, dto: UpdateClientDto, actorId: string) {
    await this.ensure(id);
    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
        ...(dto.website !== undefined ? { website: dto.website } : {}),
        ...(dto.contractType !== undefined ? { contractType: dto.contractType } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.brandColors !== undefined ? { brandColors: dto.brandColors as any } : {}),
        ...(dto.fonts !== undefined ? { fonts: dto.fonts as any } : {}),
        ...(dto.brandAssets !== undefined ? { brandAssets: dto.brandAssets as any } : {}),
      },
    });
    await this.audit(actorId, 'Client updated', 'Client', id, { name: client.name });
    return client;
  }

  async remove(id: string, actorId: string) {
    await this.ensure(id);
    await this.prisma.client.delete({ where: { id } });
    await this.audit(actorId, 'Client removed', 'Client', id, {});
    return { success: true };
  }

  // ------------------------------------------------------------
  // Stakeholders
  // ------------------------------------------------------------

  async assignStakeholder(clientId: string, dto: AssignStakeholderDto, actorId: string) {
    await this.ensure(clientId);

    const existing = await this.prisma.stakeholder.findUnique({
      where: { clientId_role: { clientId, role: dto.role } },
      include: { employee: { select: { id: true, name: true } } },
    });

    const previous = {
      previousStakeholderId: existing?.employeeId ?? null,
      previousName: existing?.employee?.name ?? existing?.name ?? null,
    };

    const stakeholder = await this.prisma.stakeholder.upsert({
      where: { clientId_role: { clientId, role: dto.role } },
      create: {
        clientId,
        role: dto.role,
        employeeId: dto.employeeId || null,
        name: dto.name || null,
        email: dto.email || null,
        phone: dto.phone || null,
        title: dto.title || null,
        isActive: true,
      },
      update: {
        employeeId: dto.employeeId || null,
        name: dto.name || null,
        email: dto.email || null,
        phone: dto.phone || null,
        title: dto.title || null,
        isActive: true,
        assignedAt: new Date(),
      },
    });

    await this.prisma.stakeholderHistory.create({
      data: {
        clientId,
        role: dto.role,
        previousStakeholderId: previous.previousStakeholderId,
        previousName: previous.previousName,
        newStakeholderId: dto.employeeId || null,
        newName: dto.name || null,
        reason: dto.reason,
        changedById: actorId,
        date: new Date(),
      },
    });

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });

    if (dto.employeeId) {
      const employee = await this.prisma.user.findUnique({ where: { id: dto.employeeId } });
      if (employee) {
        await this.prisma.notification.create({
          data: {
            userId: employee.id,
            type: 'ASSIGNMENT',
            title: 'Stakeholder assignment',
            message: `You were assigned as ${dto.role.replace(/_/g, ' ').toLowerCase()} stakeholder for ${client?.name}`,
            meta: { clientId, role: dto.role },
          },
        });
        this.events.emitToUser(employee.id, 'notification', { type: 'ASSIGNMENT', clientId, role: dto.role });
      }
    }

    await this.audit(actorId, 'Stakeholder assigned', 'Client', clientId, {
      client: client?.name,
      role: dto.role,
      name: dto.name,
      reason: dto.reason,
    });
    this.events.emitToAll('stakeholder.changed', { clientId, role: dto.role });

    return stakeholder;
  }

  async stakeholderHistory(clientId: string) {
    return this.prisma.stakeholderHistory.findMany({
      where: { clientId },
      include: { changedBy: { select: { id: true, name: true, avatar: true } } },
      orderBy: { date: 'desc' },
    });
  }

  private async ensure(id: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Client not found');
  }

  private async audit(userId: string, action: string, entity: string, entityId: string, meta: any) {
    await this.prisma.activity.create({ data: { userId, action, entityType: entity, entityId, meta } });
  }
}
