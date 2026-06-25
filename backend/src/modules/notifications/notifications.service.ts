import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { User } from '../users/entities/user.entity';
import { FindNotificationsQueryDto } from './dto/notification.dto';
import { Notification, NotificationPriority } from './entities/notification.entity';

export interface CreateNotificationInput {
  userId: string;
  companyId?: string | null;
  branchId?: string | null;
  type: string;
  priority?: NotificationPriority | string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  channelInApp?: boolean;
  channelEmail?: boolean;
  channelPush?: boolean;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findMine(query: FindNotificationsQueryDto, requester: AuthUser) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    const qb = this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.recipient_user_id = :userId', { userId: requester.id })
      .orderBy('notification.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.unreadOnly) {
      qb.andWhere('notification.is_read = :isRead', { isRead: false });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      unreadCount: await this.notificationRepo.count({
        where: { recipientUserId: requester.id, isRead: false },
      }),
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(requester: AuthUser) {
    return {
      unreadCount: await this.notificationRepo.count({
        where: { recipientUserId: requester.id, isRead: false },
      }),
    };
  }

  async markRead(id: string, requester: AuthUser, isRead = true) {
    const notification = await this.notificationRepo.findOne({
      where: { id, recipientUserId: requester.id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = isRead;
    notification.readAt = isRead ? new Date() : null;
    return this.notificationRepo.save(notification);
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
      .andWhere('is_read = :isRead', { isRead: false })
      .execute();

    return this.getUnreadCount(requester);
  }

  async createForUser(input: CreateNotificationInput) {
    const record = this.notificationRepo.create({
      id: randomUUID(),
      recipientUserId: input.userId,
      companyId: input.companyId ?? null,
      branchId: input.branchId ?? null,
      type: this.normalizeText(input.type),
      priority: this.normalizeText(input.priority || NotificationPriority.P1),
      title: this.normalizeText(input.title),
      message: this.normalizeText(input.message),
      entityType: this.optionalText(input.entityType),
      entityId: this.optionalText(input.entityId),
      actionUrl: this.optionalText(input.actionUrl),
      channelInApp: input.channelInApp ?? true,
      channelEmail: input.channelEmail ?? false,
      channelPush: input.channelPush ?? false,
      metadata: input.metadata ?? null,
      isRead: false,
      readAt: null,
    });

    return this.notificationRepo.save(record);
  }

  async createForUsers(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
    const uniqueUserIds = Array.from(new Set(userIds.map((id) => id?.trim()).filter(Boolean) as string[]));
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
        id: randomUUID(),
        recipientUserId: user.id,
        companyId: input.companyId ?? user.companyId ?? null,
        branchId: input.branchId ?? user.branchId ?? null,
        type: this.normalizeText(input.type),
        priority: this.normalizeText(input.priority || NotificationPriority.P1),
        title: this.normalizeText(input.title),
        message: this.normalizeText(input.message),
        entityType: this.optionalText(input.entityType),
        entityId: this.optionalText(input.entityId),
        actionUrl: this.optionalText(input.actionUrl),
        channelInApp: input.channelInApp ?? true,
        channelEmail: input.channelEmail ?? false,
        channelPush: input.channelPush ?? false,
        metadata: input.metadata ?? null,
        isRead: false,
        readAt: null,
      }),
    );

    return this.notificationRepo.save(rows);
  }

  private normalizeText(value: string): string {
    return String(value || '').trim();
  }

  private optionalText(value: string | null | undefined): string | null {
    const normalized = String(value || '').trim();
    return normalized.length ? normalized : null;
  }
}
