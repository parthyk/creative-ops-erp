import { Controller, Get, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('activity')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get()
  feed(@Query() query: Record<string, any>, @CurrentUser() user: any) {
    return this.activityService.feed(query, user.sub, user.role);
  }
}