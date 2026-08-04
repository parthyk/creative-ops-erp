import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AiService } from './ai.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Period } from '../common/utils/dates';

@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('insights')
  @Roles(Role.MANAGER)
  insights(@Query('period') period?: Period) {
    return this.aiService.insights(period || 'month');
  }

  @Get('summary')
  dailySummary() {
    return this.aiService.dailySummary();
  }

  @Get('report')
  @Roles(Role.MANAGER)
  report(@Query('period') period?: Period) {
    return this.aiService.monthlyReport(period || 'month');
  }
}
