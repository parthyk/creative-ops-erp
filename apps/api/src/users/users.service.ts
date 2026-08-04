import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto, actorId: string) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ConflictException('A user with this email already exists');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: await bcrypt.hash(dto.password, 10),
        name: dto.name,
        role: dto.role,
        departmentId: dto.departmentId || null,
        designation: dto.designation,
        phone: dto.phone,
        status: dto.status || 'ACTIVE',
        workingHoursPerDay: dto.workingHoursPerDay || 8,
        isApprover: dto.isApprover ?? false,
        avatar: dto.avatar,
      },
    });

    await this.prisma.activity.create({
      data: {
        userId: actorId,
        action: 'Employee added',
        entityType: 'User',
        entityId: user.id,
        meta: { name: user.name, email: user.email },
      },
    });

    const { password, ...rest } = user;
    return rest;
  }

  async findAll(filters: {
    search?: string;
    departmentId?: string;
    role?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }) {
    const { search, departmentId, role, status } = filters;
    const page = Number(filters.page) || 1;
    const perPage = Number(filters.perPage) || 100;
    const where: Prisma.UserWhereInput = {
      ...(departmentId ? { departmentId } : {}),
      ...(role ? { role: role as any } : {}),
      ...(status ? { status: status as any } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { department: true, _count: { select: { createdTasks: true } } },
        orderBy: { joinedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map(({ password, ...rest }) => rest),
      total,
      page,
      perPage,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        stakeholders: { include: { client: true } },
        attendance: { orderBy: { date: 'desc' }, take: 30 },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { password, ...rest } = user;
    return rest;
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    await this.findOne(id);
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    if (dto.departmentId !== undefined) data.department = { connect: { id: dto.departmentId } };
    if (dto.designation !== undefined) data.designation = dto.designation;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.workingHoursPerDay !== undefined) data.workingHoursPerDay = dto.workingHoursPerDay;
    if (dto.isApprover !== undefined) data.isApprover = dto.isApprover;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;

    const user = await this.prisma.user.update({ where: { id }, data });
    await this.prisma.activity.create({
      data: {
        userId: actorId,
        action: 'Employee updated',
        entityType: 'User',
        entityId: id,
        meta: { name: user.name },
      },
    });
    const { password: _p, ...rest } = user;
    return rest;
  }

  async remove(id: string, actorId: string) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.taskAssignment.deleteMany({ where: { OR: [{ fromId: id }, { toId: id }] } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
    ]);
    const user = await this.prisma.user.delete({ where: { id } });
    await this.prisma.activity.create({
      data: {
        userId: actorId,
        action: 'Employee removed',
        entityType: 'User',
        entityId: id,
        meta: { name: user.name },
      },
    });
    return { success: true };
  }

  async updateMe(userId: string, dto: { phone?: string; name?: string; avatar?: string }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.avatar !== undefined ? { avatar: dto.avatar } : {}),
      },
    });
    const { password, ...rest } = user;
    return rest;
  }
}
