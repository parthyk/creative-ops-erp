import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CalendarService } from './calendar.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminAttendanceDto, ApproveLeaveDto, HolidayDto, LeaveRequestDto } from './dto/calendar.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Post('attendance/check-in')
  checkIn(@CurrentUser('sub') userId: string, @Query('date') date?: string) {
    return this.calendarService.checkIn(userId, date);
  }

  @Get('attendance/mine')
  myAttendance(@CurrentUser('sub') userId: string, @Query('month') month?: string) {
    return this.calendarService.myAttendance(userId, month);
  }

  @Post('attendance')
  @Roles(Role.MANAGER)
  setAttendance(@Body() dto: AdminAttendanceDto) {
    return this.calendarService.setAttendance(dto);
  }

  @Post('leaves')
  requestLeave(@CurrentUser('sub') userId: string, @Body() dto: LeaveRequestDto) {
    return this.calendarService.requestLeave(userId, dto);
  }

  @Get('leaves/mine')
  myLeaves(@CurrentUser('sub') userId: string) {
    return this.calendarService.myLeaves(userId);
  }

  @Get('leaves')
  @Roles(Role.MANAGER)
  allLeaves(@Query() query: { status?: string }) {
    return this.calendarService.allLeaves(query);
  }

  @Patch('leaves/:id')
  @Roles(Role.MANAGER)
  decideLeave(@Param('id') id: string, @Body() dto: ApproveLeaveDto, @CurrentUser('sub') approverId: string) {
    return this.calendarService.decideLeave(id, dto, approverId);
  }

  @Get('holidays')
  holidays() {
    return this.calendarService.holidays();
  }

  @Post('holidays')
  @Roles(Role.MANAGER)
  addHoliday(@Body() dto: HolidayDto) {
    return this.calendarService.addHoliday(dto);
  }

  @Delete('holidays/:id')
  @Roles(Role.MANAGER)
  removeHoliday(@Param('id') id: string) {
    return this.calendarService.removeHoliday(id);
  }
}