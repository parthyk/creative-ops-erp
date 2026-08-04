import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { AdminAttendanceDto, ApproveLeaveDto, HolidayDto, LeaveRequestDto } from './dto/calendar.dto';

@Injectable()
export class CalendarService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async checkIn(userId: string, dateStr?: string) {
    const date = new Date(dateStr || new Date().toISOString().slice(0, 10));
    const existing = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: userId, date } },
    });
    if (existing) {
      if (existing.checkIn && !existing.checkOut) {
        const checkOut = new Date();
        const hours = Math.round(((checkOut.getTime() - existing.checkIn.getTime()) / 3600000) * 10) / 10;
        const updated = await this.prisma.attendance.update({
          where: { id: existing.id },
          data: { checkOut, status: 'PRESENT', hoursWorked: hours },
        });
        return { ...updated, action: 'checkout' };
      }
      return { ...existing, action: 'already' };
    }

    const attendance = await this.prisma.attendance.create({
      data: { employeeId: userId, date, status: 'PRESENT', checkIn: new Date() },
    });
    return { ...attendance, action: 'checkin' };
  }

  async myAttendance(userId: string, month?: string) {
    const d = month ? new Date(month) : new Date();
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const [records, holidays] = await Promise.all([
      this.prisma.attendance.findMany({ where: { employeeId: userId, date: { gte: from, lte: to } }, orderBy: { date: 'asc' } }),
      this.prisma.holiday.findMany({ where: { date: { gte: from, lte: to } } }),
    ]);
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const halfDay = records.filter((r) => r.status === 'HALF_DAY').length;
    const absent = records.filter((r) => r.status === 'ABSENT').length;
    const leave = records.filter((r) => r.status === 'LEAVE').length;
    return {
      records,
      holidays,
      summary: {
        present,
        halfDay,
        absent,
        leave,
        workingDays: this.countWorkingDays(from, to),
        attendanceRate: this.countWorkingDays(from, to) === 0 ? 100 : Math.round(((present + halfDay * 0.5) / this.countWorkingDays(from, to)) * 100),
      },
    };
  }

  private countWorkingDays(from: Date, to: Date) {
    let count = 0;
    const d = new Date(from);
    while (d <= to) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  async requestLeave(userId: string, dto: LeaveRequestDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start > end) throw new BadRequestException('Start date must be before end date');
    const leave = await this.prisma.leave.create({
      data: { employeeId: userId, startDate: start, endDate: end, type: dto.type, reason: dto.reason },
    });
    return leave;
  }

  async myLeaves(userId: string) {
    return this.prisma.leave.findMany({ where: { employeeId: userId }, orderBy: { startDate: 'desc' } });
  }

  async allLeaves(query: { status?: string }) {
    return this.prisma.leave.findMany({
      where: query.status ? { status: query.status as any } : {},
      include: { employee: { select: { id: true, name: true, avatar: true, designation: true } } },
      orderBy: { startDate: 'desc' },
    });
  }

  async decideLeave(id: string, dto: ApproveLeaveDto, approverId: string) {
    const leave = await this.prisma.leave.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Leave not found');
    const updated = await this.prisma.leave.update({
      where: { id },
      data: { status: dto.status, approvedById: approverId, approvedAt: new Date() },
    });
    await this.prisma.notification.create({
      data: {
        userId: leave.employeeId,
        type: 'APPROVAL',
        title: `Leave ${dto.status.toLowerCase()}`,
        message: `Your leave (${leave.type}) from ${leave.startDate.toISOString().slice(0, 10)} was ${dto.status.toLowerCase()}.`,
      },
    });
    this.events.emitToUser(leave.employeeId, 'notification', { type: 'APPROVAL' });
    return updated;
  }

  async addHoliday(dto: HolidayDto) {
    return this.prisma.holiday.upsert({
      where: { date: new Date(dto.date) },
      create: { name: dto.name, date: new Date(dto.date), type: dto.type || 'GAZETTED' },
      update: { name: dto.name, type: dto.type || 'GAZETTED' },
    });
  }

  async holidays() {
    return this.prisma.holiday.findMany({ orderBy: { date: 'asc' } });
  }

  async removeHoliday(id: string) {
    await this.prisma.holiday.delete({ where: { id } });
    return { success: true };
  }

  async setAttendance(dto: AdminAttendanceDto) {
    const date = new Date(dto.date);
    return this.prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date } },
      create: { employeeId: dto.employeeId, date, status: dto.status, note: dto.note },
      update: { status: dto.status, note: dto.note },
    });
  }
}