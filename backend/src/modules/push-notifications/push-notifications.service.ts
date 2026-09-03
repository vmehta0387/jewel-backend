import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { NotificationPushDevice } from '../notifications/entities/notification-push-device.entity';
import { Notification, NotificationPriority } from '../notifications/entities/notification.entity';
import { RegisterPushDeviceDto, UnregisterPushDeviceDto } from '../notifications/dto/notification.dto';

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private readonly expoPushUrl: string;

  constructor(
    @InjectRepository(NotificationPushDevice)
    private readonly pushDeviceRepo: Repository<NotificationPushDevice>,
    private readonly configService: ConfigService,
  ) {
    this.expoPushUrl = this.configService.get<string>('EXPO_PUSH_URL') || 'https://exp.host/--/api/v2/push/send';
  }

  async registerDevice(requester: AuthUser, dto: RegisterPushDeviceDto) {
    const expoPushToken = this.normalizePushToken(dto.expoPushToken);
    if (!expoPushToken) {
      throw new NotFoundException('Push token is required');
    }

    const platform = this.optionalText(dto.platform);
    const deviceId = this.optionalText(dto.deviceId);
    const appVersion = this.optionalText(dto.appVersion);

    const existing = await this.pushDeviceRepo.findOne({
      where: { expoPushToken },
    });

    const record = existing
      ? Object.assign(existing, {
        userId: requester.id,
        platform,
        deviceId,
        appVersion,
        isActive: true,
        lastRegisteredAt: new Date(),
        lastError: null,
      })
      : this.pushDeviceRepo.create({
        userId: requester.id,
        expoPushToken,
        platform,
        deviceId,
        appVersion,
        isActive: true,
        lastRegisteredAt: new Date(),
        lastError: null,
      });

    const saved = await this.pushDeviceRepo.save(record);
    this.logger.log('Push device registered id=' + saved.id + ' userId=' + saved.userId + ' platform=' + (saved.platform || '-') + ' deviceId=' + (saved.deviceId || '-') + ' tokenPrefix=' + saved.expoPushToken.slice(0, 24) + ' active=' + saved.isActive);

    if (deviceId) {
      const deactivateResult = await this.pushDeviceRepo
        .createQueryBuilder()
        .update(NotificationPushDevice)
        .set({ isActive: false })
        .where('user_id = :userId', { userId: requester.id })
        .andWhere('device_id = :deviceId', { deviceId })
        .andWhere('id != :id', { id: saved.id })
        .execute();
      if (deactivateResult.affected) {
        this.logger.log('Push device old registrations deactivated userId=' + requester.id + ' deviceId=' + deviceId + ' count=' + deactivateResult.affected);
      }
    }

    return {
      success: true,
      id: saved.id,
      expoPushToken: saved.expoPushToken,
      isActive: saved.isActive,
    };
  }

  async unregisterDevice(requester: AuthUser, dto: UnregisterPushDeviceDto) {
    const expoPushToken = this.normalizePushToken(dto.expoPushToken);
    if (!expoPushToken) {
      throw new NotFoundException('Push token is required');
    }

    const record = await this.pushDeviceRepo.findOne({
      where: { expoPushToken, userId: requester.id },
    });

    if (!record) {
      this.logger.log('Push device unregister skipped userId=' + requester.id + ' reason=not_found tokenPrefix=' + expoPushToken.slice(0, 24));
      return { success: true };
    }

    record.isActive = false;
    await this.pushDeviceRepo.save(record);
    this.logger.log('Push device unregistered id=' + record.id + ' userId=' + record.userId + ' tokenPrefix=' + record.expoPushToken.slice(0, 24));
    return { success: true };
  }

  private getNotificationActorId(notification: Notification): string | null {
    const metadata = notification.metadata || {};
    const actorId = metadata.updatedByUserId ?? metadata.generatedByUserId ?? metadata.requesterUserId ?? metadata.performedBy;
    const normalized = String(actorId || '').trim();
    return normalized || null;
  }

  private isSelfActionNotification(notification: Notification): boolean {
    const actorId = this.getNotificationActorId(notification);
    return Boolean(actorId && String(notification.recipientUserId) === actorId);
  }

  async sendForNotifications(notifications: Notification[]) {
    const candidateNotifications = notifications.filter((item) => item.channelPush && !item.isRead && item.recipientUserId && !this.isSelfActionNotification(item));
    this.logger.log('Push fanout start total=' + notifications.length + ' candidates=' + candidateNotifications.length);
    if (!candidateNotifications.length) {
      return;
    }

    const userIds = Array.from(new Set(candidateNotifications.map((item) => item.recipientUserId).filter(Boolean)));
    if (!userIds.length) {
      this.logger.warn('Push fanout skipped reason=no_recipient_user_ids');
      return;
    }

    const devices = await this.pushDeviceRepo.find({
      where: {
        userId: In(userIds),
        isActive: true,
      },
    });

    this.logger.log('Push fanout devices active=' + devices.length + ' users=' + userIds.join(','));

    if (!devices.length) {
      this.logger.warn('Push fanout skipped reason=no_active_devices users=' + userIds.join(','));
      return;
    }

    const messages = candidateNotifications.flatMap((notification) => {
      const userDevices = devices.filter(
        (device) => device.userId === notification.recipientUserId && this.isValidExpoPushToken(device.expoPushToken),
      );
      const isSpiffReward = this.isSpiffRewardNotification(notification);

      return userDevices.map((device) => ({
        to: device.expoPushToken,
        title: notification.title,
        body: notification.message,
        sound: isSpiffReward ? 'spiff_coin.wav' : 'default',
        channelId: isSpiffReward ? 'spiff-rewards' : 'blitz-alerts',
        priority: isSpiffReward || notification.priority === NotificationPriority.P0 ? 'high' : 'default',
        data: {
          notificationId: notification.id,
          type: notification.type,
          priority: notification.priority,
          entityType: notification.entityType,
          entityId: notification.entityId,
          actionUrl: notification.actionUrl,
          metadata: notification.metadata ?? null,
          notificationSound: isSpiffReward ? 'spiff_coin.wav' : 'default',
          notificationChannelId: isSpiffReward ? 'spiff-rewards' : 'blitz-alerts',
        },
      }));
    });

    this.logger.log('Push fanout messages=' + messages.length + ' notifications=' + candidateNotifications.map((item) => item.id).join(','));

    if (!messages.length) {
      this.logger.warn('Push fanout skipped reason=no_valid_expo_tokens users=' + userIds.join(','));
      return;
    }

    const chunks: Array<typeof messages> = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
        this.logger.log('Push Expo request chunkSize=' + chunk.length + ' url=' + this.expoPushUrl);
        const response = await fetch(this.expoPushUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(chunk),
        });

        const payload = (await response.json().catch(() => null)) as
          | {
            data?: Array<{ status?: string; details?: { error?: string } }>;
            errors?: Array<{ message?: string }>;
          }
          | null;

        if (!response.ok) {
          const message =
            payload?.errors?.map((item) => item?.message).filter(Boolean).join(', ')
            || `Expo push request failed with status ${response.status}`;
          this.logger.warn(`Push delivery failed: ${message}`);
          continue;
        }

        const tickets = payload?.data || [];
        this.logger.log('Push Expo response status=' + response.status + ' tickets=' + tickets.length);
        await Promise.all(
          chunk.map(async (message, index) => {
            const ticket = tickets[index];
            const device = devices.find((item) => item.expoPushToken === message.to);
            if (!device) return;

            if (ticket?.status === 'error') {
              const errorText = ticket?.details?.error || 'Expo push rejected the token';
              this.logger.warn('Push ticket error deviceId=' + device.id + ' userId=' + device.userId + ' tokenPrefix=' + device.expoPushToken.slice(0, 24) + ' error=' + errorText);
              device.lastError = errorText;
              if (errorText === 'DeviceNotRegistered') {
                device.isActive = false;
              }
              await this.pushDeviceRepo.save(device);
              return;
            }

            this.logger.log('Push ticket ok deviceId=' + device.id + ' userId=' + device.userId + ' tokenPrefix=' + device.expoPushToken.slice(0, 24) + ' notificationTo=' + message.to.slice(0, 24));
            device.lastDeliveredAt = new Date();
            device.lastError = null;
            await this.pushDeviceRepo.save(device);
          }),
        );
      } catch (error: any) {
        this.logger.warn(`Push delivery failed: ${error?.message || 'unknown error'}`);
      }
    }
  }

  private isSpiffRewardNotification(notification: Notification): boolean {
    const type = String(notification.type || '').toUpperCase();
    const entityType = String(notification.entityType || '').toUpperCase();
    return [
      'SPIFF_POINTS_GIVEN',
      'SPIFF_EARNED',
      'SPIFF_CLAIM_APPROVED',
    ].includes(type) || entityType === 'SPIFF_LEDGER';
  }

  private normalizePushToken(value: string | null | undefined): string | null {
    const normalized = String(value || '').trim();
    return this.isValidExpoPushToken(normalized) ? normalized : null;
  }

  private isValidExpoPushToken(value: string | null | undefined): boolean {
    const normalized = String(value || '').trim();
    return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(normalized);
  }

  private optionalText(value: string | null | undefined): string | null {
    const normalized = String(value || '').trim();
    return normalized.length ? normalized : null;
  }
}
