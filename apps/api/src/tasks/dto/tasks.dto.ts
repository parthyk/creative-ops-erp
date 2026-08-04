import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { Priority, TaskStatus, TaskType } from '@prisma/client';

export class CreateTaskDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsEnum(TaskType)
  taskType: TaskType;

  @IsString()
  taskName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsNumber()
  estimatedTime?: number;

  @IsOptional()
  @IsNumber()
  actualTime?: number;

  @IsOptional()
  @IsNumber()
  taskCount?: number;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateTaskDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;

  @IsOptional()
  @IsString()
  taskName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsNumber()
  estimatedTime?: number;

  @IsOptional()
  @IsNumber()
  actualTime?: number;

  @IsOptional()
  @IsNumber()
  taskCount?: number;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsNumber()
  revisionCount?: number;
}

export class ReassignTaskDto {
  @IsString()
  toId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddCommentDto {
  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];
}
