import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/departments.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      include: { _count: { select: { users: true, tasks: true } }, head: { select: { id: true, name: true, avatar: true } } },
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: { ...dto, headId: dto.headId || undefined },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.ensure(id);
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensure(id);
    await this.prisma.department.delete({ where: { id } });
    return { success: true };
  }

  private async ensure(id: string) {
    const d = await this.prisma.department.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Department not found');
  }
}
