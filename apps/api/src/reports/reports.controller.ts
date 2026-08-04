import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('reports')
@Roles(Role.MANAGER)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('tasks')
  exportTasks(@Res() res: Response, @Query() query: Record<string, any>) {
    return this.reportsService.exportTasks(res, query);
  }

  @Get('employees')
  exportEmployees(@Res() res: Response, @Query() query: Record<string, any>) {
    return this.reportsService.exportEmployees(res, query);
  }

  @Get('kpi')
  exportKpi(@Res() res: Response, @Query() query: Record<string, any>) {
    return this.reportsService.exportKpi(res, query);
  }
}