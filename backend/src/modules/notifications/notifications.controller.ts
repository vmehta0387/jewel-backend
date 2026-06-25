import { Controller, Get, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { FindNotificationsQueryDto } from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMine(@Query() query: FindNotificationsQueryDto, @Request() req: { user: AuthUser }) {
    return this.notificationsService.findMine(query, req.user);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: { user: AuthUser }) {
    return this.notificationsService.getUnreadCount(req.user);
  }

  @Patch('read-all')
  markAllRead(@Request() req: { user: AuthUser }) {
    return this.notificationsService.markAllRead(req.user);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.notificationsService.markRead(id, req.user, true);
  }
}
