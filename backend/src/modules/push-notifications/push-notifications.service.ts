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

    if (deviceId) {
      await this.pushDeviceRepo
        .createQueryBuilder()
        .update(NotificationPushDevice)
        .set({ isActive: false })
        .where('user_id = :userId', { userId: requester.id })
        .andWhere('device_id = :deviceId', { deviceId })
        .andWhere('id != :id', { id: saved.id })
        .execute();
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
      return { success: true };
    }

    record.isActive = false;
    await this.pushDeviceRepo.save(record);
    return { success: true };
  }

  async sendForNotifications(notifications: Notification[]) {
    const candidateNotifications = notifications.filter((item) => item.channelPush && !item.isRead && item.recipientUserId);
    if (!candidateNotifications.length) {
      return;
    }

    const userIds = Array.from(new Set(candidateNotifications.map((item) => item.recipientUserId).filter(Boolean)));
    if (!userIds.length) {
      return;
    }

    const devices = await this.pushDeviceRepo.find({
      where: {
        userId: In(userIds),
        isActive: true,
      },
    });

    if (!devices.length) {
      return;
    }

    const messages = candidateNotifications.flatMap((notification) => {
      const userDevices = devices.filter(
        (device) => device.userId === notification.recipientUserId && this.isValidExpoPushToken(device.expoPushToken),
      );

      return userDevices.map((device) => ({
        to: device.expoPushToken,
        title: notification.title,
        body: notification.message,
        sound: 'default',
        priority: notification.priority === NotificationPriority.P0 ? 'high' : 'default',
        data: {
          notificationId: notification.id,
          type: notification.type,
          priority: notification.priority,
          entityType: notification.entityType,
          entityId: notification.entityId,
          actionUrl: notification.actionUrl,
          metadata: notification.metadata ?? null,
        },
      }));
    });

    if (!messages.length) {
      return;
    }

    const chunks: Array<typeof messages> = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    for (const chunk of chunks) {
      try {
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
        await Promise.all(
          chunk.map(async (message, index) => {
            const ticket = tickets[index];
            const device = devices.find((item) => item.expoPushToken === message.to);
            if (!device) return;

            if (ticket?.status === 'error') {
              const errorText = ticket?.details?.error || 'Expo push rejected the token';
              device.lastError = errorText;
              if (errorText === 'DeviceNotRegistered') {
                device.isActive = false;
              }
              await this.pushDeviceRepo.save(device);
              return;
            }

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

