import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { AttendanceStatus, LeaveStatus, LeaveType } from '@prisma/client';

export class CheckInDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class LeaveRequestDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(LeaveType)
  type: LeaveType;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveLeaveDto {
  @IsEnum(LeaveStatus)
  status: 'APPROVED' | 'REJECTED';
}

export class HolidayDto {
  @IsString()
  name: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class AdminAttendanceDto {
  @IsString()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
