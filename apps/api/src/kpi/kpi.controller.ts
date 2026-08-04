import { Controller, Get, Param, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { KpiService } from './kpi.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Period } from '../common/utils/dates';

@Controller('kpi')
export class KpiController {
  constructor(private kpiService: KpiService) {}

  @Get('employee')
  myKpi(@CurrentUser('sub') userId: string, @Query('period') period?: Period) {
    return this.kpiService.employeeKpi(userId, period || 'month');
  }

  @Get('employee/:id')
  @Roles(Role.MANAGER)
  employeeKpi(@Param('id') id: string, @Query('period') period?: Period) {
    return this.kpiService.employeeKpi(id, period || 'month');
  }

  @Get('leaderboard')
  @Roles(Role.MANAGER)
  leaderboard(@Query('period') period?: Period, @Query('limit') limit?: string) {
    return this.kpiService.leaderboard(period || 'month', new Date(), limit ? parseInt(limit, 10) : 20);
  }

  @Get('team')
  @Roles(Role.MANAGER)
  team(@Query('period') period?: Period) {
    return this.kpiService.teamKpi(period || 'month');
  }
}
