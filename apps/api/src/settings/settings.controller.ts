import { Body, Controller, Get, Post, Param } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SettingsService } from './settings.service';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  getAll() {
    return this.settingsService.getAll();
  }

  @Get('kpi')
  kpiWeights() {
    return this.settingsService.getKpiWeights();
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.settingsService.get(key);
  }

  @Post('kpi')
  @Roles(Role.MANAGER)
  updateKpiWeights(@Body() weights: Record<string, number>) {
    return this.settingsService.updateKpiWeights(weights);
  }

  @Post(':key')
  @Roles(Role.MANAGER)
  set(@Param('key') key: string, @Body() value: any) {
    return this.settingsService.set(key, value);
  }
}