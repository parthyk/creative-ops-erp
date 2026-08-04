import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { Period } from '../common/utils/dates';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('summary')
  summary(@Query('period') period?: Period, @CurrentUser() user?: AuthUser) {
    return this.dashboardService.summary(period || 'month', { userId: user?.sub, role: user?.role });
  }

  @Get('ranking')
  @Roles(Role.MANAGER)
  ranking(@Query('period') period?: Period) {
    return this.dashboardService.employeeRanking(period || 'month');
  }

  @Get('growth')
  growth() {
    return this.dashboardService.monthlyGrowth();
  }

  @Get('trend')
  trend(@Query('period') period?: Period, @CurrentUser() user?: AuthUser) {
    return this.dashboardService.taskTrend(period || 'month', user?.sub, user?.role);
  }

  @Get('departments')
  departments(@Query('period') period?: Period, @CurrentUser() user?: AuthUser) {
    return this.dashboardService.departmentLoad(period || 'month', user?.role, user?.sub);
  }
}
