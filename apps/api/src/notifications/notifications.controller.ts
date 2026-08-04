import { Body, Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser('sub') userId: string, @Query() query: Record<string, any>) {
    return this.notificationsService.findAll(userId, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('sub') userId: string) {
    return this.notificationsService.findAll(userId, { unread: 'true', perPage: 1 }).then((r) => ({ count: r.unread }));
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('sub') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(userId, id);
  }
}