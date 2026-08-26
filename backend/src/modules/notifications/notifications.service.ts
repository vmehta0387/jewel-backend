import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Brackets, In, Not, Repository } from 'typeorm';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { User } from '../users/entities/user.entity';
import {
  FindNotificationsQueryDto,
  RegisterPushDeviceDto,
  SendCustomNotificationDto,
  UnregisterPushDeviceDto,
} from './dto/notification.dto';
import { NotificationPushDevice } from './entities/notification-push-device.entity';
import { Notification, NotificationPriority } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

const DESIGN_UPDATED_NOTIFICATION_TYPE = 'DESIGN_UPDATED';

export interface CreateNotificationInput {
  userId: number;
  companyId?: number | null;
  branchId?: number | null;
  type: string;
  priority?: NotificationPriority | string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: number | null;
  actionUrl?: string | null;
  channelInApp?: boolean;
  channelEmail?: boolean;
  channelPush?: boolean;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoPushUrl: string;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationPushDevice)
    private readonly pushDeviceRepo: Repository<NotificationPushDevice>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly configService: ConfigService,
  ) {
    this.expoPushUrl = this.configService.get<string>('EXPO_PUSH_URL') || 'https://exp.host/--/api/v2/push/send';
  }

  async findMine(query: FindNotificationsQueryDto, requester: AuthUser) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    const qb = this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.recipient_user_id = :userId', { userId: requester.id })
      .andWhere('notification.channel_in_app = :channelInApp', { channelInApp: true })
      .andWhere('notification.type != :hiddenType', {
        hiddenType: DESIGN_UPDATED_NOTIFICATION_TYPE,
      })
      .orderBy('notification.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.unreadOnly) {
      qb.andWhere('notification.is_read = :isRead', { isRead: false });
    }

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('notification.title LIKE :search', { search })
            .orWhere('notification.message LIKE :search', { search })
            .orWhere('notification.type LIKE :search', { search })
            .orWhere('notification.entity_type LIKE :search', { search });
        }),
      );
    }

    const alertParams = {
      p0: NotificationPriority.P0,
      approval: '%APPROVAL%',
      cancelled: '%CANCELLED%',
      rejected: '%REJECTED%',
      hold: '%HOLD%',
    };
    const alertCondition =
      '(notification.priority = :p0 OR UPPER(notification.type) LIKE :approval OR UPPER(notification.type) LIKE :cancelled OR UPPER(notification.type) LIKE :rejected OR UPPER(notification.type) LIKE :hold)';

    if (query.section === 'ALERTS') {
      qb.andWhere(alertCondition, alertParams);
    } else if (query.section === 'UPDATES') {
      qb.andWhere(`NOT ${alertCondition}`, alertParams);
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      unreadCount: await this.notificationRepo.count({
        where: {
          recipientUserId: requester.id,
          isRead: false,
          channelInApp: true,
          type: Not(DESIGN_UPDATED_NOTIFICATION_TYPE),
        },
      }),
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(requester: AuthUser) {
    return {
      unreadCount: await this.notificationRepo.count({
        where: {
          recipientUserId: requester.id,
          isRead: false,
          channelInApp: true,
          type: Not(DESIGN_UPDATED_NOTIFICATION_TYPE),
        },
      }),
    };
  }

  async markRead(id: number, requester: AuthUser, isRead = true) {
    const notification = await this.notificationRepo.findOne({
      where: { id, recipientUserId: requester.id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = isRead;
    notification.readAt = isRead ? new Date() : null;
    const saved = await this.notificationRepo.save(notification);
    await this.emitUnreadCountUpdate(requester.id);
    return saved;
  }

  async markAllRead(requester: AuthUser) {
    await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where('recipient_user_id = :userId', { userId: requester.id })
      .andWhere('channel_in_app = :channelInApp', { channelInApp: true })
      .andWhere('is_read = :isRead', { isRead: false })
      .execute();

    const result = await this.getUnreadCount(requester);
    this.notificationsGateway.emitUnreadCount(requester.id, result.unreadCount);
    return result;
  }

  async registerPushDevice(requester: AuthUser, dto: RegisterPushDeviceDto) {
    const expoPushToken = this.normalizePushToken(dto.expoPushToken);
    if (!expoPushToken) {
      throw new NotFoundException('Push token is required');
    }

    const existing = await this.pushDeviceRepo.findOne({
      where: { expoPushToken },
    });

    const record = existing
      ? Object.assign(existing, {
        userId: requester.id,
        platform: this.optionalText(dto.platform),
        deviceId: this.optionalText(dto.deviceId),
        appVersion: this.optionalText(dto.appVersion),
        isActive: true,
        lastRegisteredAt: new Date(),
        lastError: null,
      })
      : this.pushDeviceRepo.create({
        userId: requester.id,
        expoPushToken,
        platform: this.optionalText(dto.platform),
        deviceId: this.optionalText(dto.deviceId),
        appVersion: this.optionalText(dto.appVersion),
        isActive: true,
        lastRegisteredAt: new Date(),
        lastError: null,
      });

    const saved = await this.pushDeviceRepo.save(record);
    return {
      success: true,
      id: saved.id,
      expoPushToken: saved.expoPushToken,
      isActive: saved.isActive,
    };
  }

  async unregisterPushDevice(requester: AuthUser, dto: UnregisterPushDeviceDto) {
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

  async createForUser(input: CreateNotificationInput) {
    const record = this.notificationRepo.create({
      recipientUserId: input.userId,
      companyId: input.companyId ?? null,
      branchId: input.branchId ?? null,
      type: this.normalizeText(input.type),
      priority: this.normalizeText(input.priority || NotificationPriority.P1),
      title: this.normalizeText(input.title),
      message: this.normalizeText(input.message),
      entityType: this.optionalText(input.entityType),
      entityId: input.entityId ?? null,
      actionUrl: this.optionalText(input.actionUrl),
      channelInApp: input.channelInApp ?? true,
      channelEmail: input.channelEmail ?? false,
      channelPush: input.channelPush ?? false,
      metadata: input.metadata ?? null,
      isRead: false,
      readAt: null,
    });

    const saved = await this.notificationRepo.save(record);
    await this.emitUnreadCountUpdate(saved.recipientUserId);
    await this.sendPushForNotifications([saved]);
    return saved;
  }

  async createForUsers(userIds: number[], input: Omit<CreateNotificationInput, 'userId'>) {
    const uniqueUserIds = Array.from(new Set(userIds.filter((id) => typeof id === 'number')));
    if (!uniqueUserIds.length) return [];

    const users = await this.userRepo.find({
      where: {
        id: In(uniqueUserIds),
        isActive: true,
      },
      select: ['id', 'companyId', 'branchId'],
    });

    if (!users.length) return [];

    const rows = users.map((user) =>
      this.notificationRepo.create({
        recipientUserId: user.id,
        companyId: input.companyId ?? user.companyId ?? null,
        branchId: input.branchId ?? user.branchId ?? null,
        type: this.normalizeText(input.type),
        priority: this.normalizeText(input.priority || NotificationPriority.P1),
        title: this.normalizeText(input.title),
        message: this.normalizeText(input.message),
        entityType: this.optionalText(input.entityType),
        entityId: input.entityId ?? null,
        actionUrl: this.optionalText(input.actionUrl),
        channelInApp: input.channelInApp ?? true,
        channelEmail: input.channelEmail ?? false,
        channelPush: input.channelPush ?? false,
        metadata: input.metadata ?? null,
        isRead: false,
        readAt: null,
      }),
    );

    const saved = await this.notificationRepo.save(rows);
    await Promise.all(uniqueUserIds.map((userId) => this.emitUnreadCountUpdate(userId)));
    await this.sendPushForNotifications(saved);
    return saved;
  }

  async sendCustomNotification(requester: AuthUser, dto: SendCustomNotificationDto) {
    const title = this.normalizeText(dto.title);
    const message = this.normalizeText(dto.message);
    if (!title || !message) {
      throw new BadRequestException('Title and message are required');
    }

    const targetMode = dto.targetMode || 'ALL';
    const usersQuery = this.userRepo
      .createQueryBuilder('user')
      .leftJoin('user.company', 'company')
      .leftJoin('user.branch', 'branch')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.id != :requesterId', { requesterId: requester.id });

    if (targetMode === 'SELECTED') {
      const selectedUserIds = Array.from(new Set((dto.selectedUserIds || []).filter((id) => Number.isFinite(Number(id)))));
      if (!selectedUserIds.length) {
        throw new BadRequestException('Select at least one user');
      }
      usersQuery.andWhere('user.id IN (:...selectedUserIds)', { selectedUserIds });
    } else if (targetMode === 'FILTERED') {
      if (dto.role) {
        usersQuery.andWhere('user.role = :role', { role: dto.role });
      }
      if (dto.companyId) {
        usersQuery.andWhere('user.companyId = :companyId', { companyId: dto.companyId });
      }
      if (dto.branchId) {
        usersQuery.andWhere('user.branchId = :branchId', { branchId: dto.branchId });
      }
      const search = this.optionalText(dto.userSearch);
      if (search) {
        usersQuery.andWhere(
          '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search OR company.companyName LIKE :search OR branch.name LIKE :search)',
          { search: `%${search}%` },
        );
      }
    }

    const recipients = await usersQuery.select(['user.id']).getMany();
    const recipientIds = recipients.map((user) => user.id);
    if (!recipientIds.length) {
      throw new BadRequestException('No matching users found');
    }

    const entityType = dto.activityType === 'GENERAL' ? null : dto.activityType;
    const entityId = dto.activityType === 'GENERAL' ? null : dto.activityRecordId ?? null;
    const actionUrl =
      dto.activityType === 'ORDER' && entityId
        ? `/orders?open=${entityId}`
        : dto.activityType === 'DESIGN' && entityId
          ? `/products?open=${entityId}`
          : null;

    const saved = await this.createForUsers(recipientIds, {
      type: `CUSTOM_${dto.activityType}`,
      priority: dto.priority || NotificationPriority.P1,
      title,
      message,
      entityType,
      entityId,
      actionUrl,
      channelInApp: true,
      channelPush: dto.channelPush ?? true,
      metadata: {
        generatedByUserId: requester.id,
        activityType: dto.activityType,
        activityRecordId: entityId,
        targetMode,
        filters: {
          role: dto.role || null,
          companyId: dto.companyId || null,
          branchId: dto.branchId || null,
          userSearch: dto.userSearch || null,
          selectedUserIds: targetMode === 'SELECTED' ? recipientIds : undefined,
        },
      },
    });

    return {
      success: true,
      targetUsers: recipientIds.length,
      createdNotifications: saved.length,
    };
  }
  private async sendPushForNotifications(notifications: Notification[]) {
    const pushNotifications = notifications.filter(
      (item) => item.channelPush && !item.isRead && this.isSupportedExpoTokenValue(item.recipientUserId),
    );

    const candidateNotifications = notifications.filter((item) => item.channelPush && !item.isRead);
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
        (device) =>
          device.userId === notification.recipientUserId && this.isValidExpoPushToken(device.expoPushToken),
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

  private async emitUnreadCountUpdate(userId: number) {
    try {
      const unreadCount = await this.notificationRepo.count({
        where: {
          recipientUserId: userId,
          isRead: false,
          type: Not(DESIGN_UPDATED_NOTIFICATION_TYPE),
        },
      });
      this.notificationsGateway.emitUnreadCount(userId, unreadCount);
    } catch {
      // Socket delivery is best-effort; the database remains the source of truth.
    }
  }

  private normalizeText(value: string): string {
    return String(value || '').trim();
  }

  private normalizePushToken(value: string | null | undefined): string | null {
    const normalized = String(value || '').trim();
    return this.isValidExpoPushToken(normalized) ? normalized : null;
  }

  private isValidExpoPushToken(value: string | null | undefined): boolean {
    const normalized = String(value || '').trim();
    return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(normalized);
  }

  private isSupportedExpoTokenValue(value: number | null | undefined): boolean {
    return Boolean(value);
  }

  private optionalText(value: string | null | undefined): string | null {
    const normalized = String(value || '').trim();
    return normalized.length ? normalized : null;
  }
}



