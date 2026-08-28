import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationEventsService } from './notification-events.service';

@Module({
  imports: [NotificationsModule],
  providers: [NotificationEventsService],
  exports: [NotificationEventsService],
})
export class NotificationEventsModule {}