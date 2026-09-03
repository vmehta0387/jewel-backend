import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { Notification, NotificationPriority } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';
import { EmailService } from '../email/email.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

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

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pushNotificationsService: PushNotificationsService,
    private readonly emailService: EmailService,
    private readonly emailTemplatesService: EmailTemplatesService,
  ) {}

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
    return this.pushNotificationsService.registerDevice(requester, dto);
  }

  async unregisterPushDevice(requester: AuthUser, dto: UnregisterPushDeviceDto) {
    return this.pushNotificationsService.unregisterDevice(requester, dto);
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
    this.logger.log('Notification saved id=' + saved.id + ' userId=' + saved.recipientUserId + ' type=' + saved.type + ' channels=inApp:' + saved.channelInApp + ' push:' + saved.channelPush + ' email:' + saved.channelEmail + ' entity=' + (saved.entityType || '-') + ':' + (saved.entityId || '-'));
    await this.emitUnreadCountUpdate(saved.recipientUserId);
    await this.pushNotificationsService.sendForNotifications([saved]);
    await this.sendEmailForNotifications([saved]);
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
    this.logger.log('Notifications saved count=' + saved.length + ' users=' + uniqueUserIds.join(',') + ' type=' + input.type + ' channels=inApp:' + Boolean(input.channelInApp ?? true) + ' push:' + Boolean(input.channelPush) + ' email:' + Boolean(input.channelEmail) + ' entity=' + (input.entityType || '-') + ':' + (input.entityId || '-'));
    await Promise.all(uniqueUserIds.map((userId) => this.emitUnreadCountUpdate(userId)));
    await this.pushNotificationsService.sendForNotifications(saved);
    await this.sendEmailForNotifications(saved);
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
      channelInApp: dto.channelPush ? true : dto.channelInApp ?? true,
      channelPush: dto.channelPush ?? false,
      metadata: {
        generatedByUserId: requester.id,
        activityType: dto.activityType,
        activityRecordId: entityId,
        targetMode,
        channels: {
          inApp: dto.channelPush ? true : dto.channelInApp ?? true,
          push: dto.channelPush ?? false,
        },
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
  private async sendEmailForNotifications(notifications: Notification[]) {
    const emailNotifications = notifications.filter((item) => item.channelEmail && item.recipientUserId);
    this.logger.log('Email notification fanout candidates=' + emailNotifications.length + ' total=' + notifications.length);
    if (!emailNotifications.length) {
      return;
    }

    const userIds = Array.from(new Set(emailNotifications.map((item) => item.recipientUserId).filter(Boolean)));
    const users = await this.userRepo.find({
      where: { id: In(userIds), isActive: true },
      select: ['id', 'email', 'firstName', 'lastName', 'role'],
    });
    const usersById = new Map(users.map((user) => [user.id, user]));

    await Promise.all(
      emailNotifications.map(async (notification) => {
        const user = usersById.get(notification.recipientUserId);
        if (!user?.email) {
          this.logger.warn('Email notification skipped notificationId=' + notification.id + ' userId=' + notification.recipientUserId + ' reason=no_email');
          return;
        }

        const recipientName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined;
        const variables = {
          ...(notification.metadata || {}),
          title: notification.title,
          message: notification.message,
          action_url: notification.actionUrl || '',
          recipient_first_name: user.firstName || '',
          recipient_last_name: user.lastName || '',
          recipient_name: recipientName || '',
          recipient_email: user.email,
        };
        const rendered = await this.emailTemplatesService.renderForAction({
          actionType: notification.type,
          recipientRole: user.role,
          variables,
        });

        if (rendered && rendered.missingVariables.length === 0) {
          await this.emailService.sendMail({
            to: { email: user.email, name: recipientName },
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          });
          this.logger.log('Email notification sent notificationId=' + notification.id + ' userId=' + notification.recipientUserId + ' to=' + user.email + ' template=custom actionType=' + notification.type);
          return;
        }

        await this.emailService.sendNotificationEmail({
          to: {
            email: user.email,
            name: recipientName,
          },
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          type: notification.type,
          metadata: notification.metadata,
        });
        this.logger.log('Email notification sent notificationId=' + notification.id + ' userId=' + notification.recipientUserId + ' to=' + user.email + ' template=fallback actionType=' + notification.type);
      }),
    );
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
      this.logger.log('In-app notification socket unread_count userId=' + userId + ' unreadCount=' + unreadCount);
    } catch (error: any) {
      this.logger.warn('In-app notification socket emit failed userId=' + userId + ': ' + (error?.message || String(error)));
      // Socket delivery is best-effort; the database remains the source of truth.
    }
  }

  private normalizeText(value: string): string {
    return String(value || '').trim();
  }


  private optionalText(value: string | null | undefined): string | null {
    const normalized = String(value || '').trim();
    return normalized.length ? normalized : null;
  }
}
