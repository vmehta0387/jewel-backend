import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { NotificationPushDevice } from '../notifications/entities/notification-push-device.entity';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([NotificationPushDevice, User])],
  providers: [PushNotificationsService],
  exports: [PushNotificationsService],
})
export class PushNotificationsModule {}