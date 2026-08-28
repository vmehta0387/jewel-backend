import { Injectable } from '@nestjs/common';
import { CreateNotificationInput, NotificationsService } from '../notifications/notifications.service';

export type NotificationActivity =
  | 'ORDER_CREATED'
  | 'ORDER_APPROVAL_REQUIRED'
  | 'ORDER_APPROVED'
  | 'ORDER_IN_PRODUCTION'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'PRICING_UPDATED'
  | 'PRODUCT_IMPORT_FAILED'
  | 'SPIFF_CLAIM_SUBMITTED'
  | 'SPIFF_CLAIM_REVIEW_REQUIRED'
  | 'SPIFF_CLAIM_APPROVED'
  | 'SPIFF_CLAIM_REJECTED'
  | 'SPIFF_CLAIM_HOLD'
  | 'SPIFF_CLAIM_FULFILLED'
  | 'SPIFF_POINTS_GIVEN'
  | 'USER_ACCOUNT_CREATED'
  | 'USER_ROLE_CHANGED'
  | string;

export interface NotificationEventInput extends Omit<CreateNotificationInput, 'type'> {
  type: NotificationActivity;
}

export interface NotificationEventPayload {
  activity: NotificationActivity;
  recipients: {
    userId?: number;
    userIds?: number[];
  };
  channels?: NotificationChannelOptions;
  content: {
    title: string;
    message: string;
  };
  priority?: CreateNotificationInput['priority'];
  scope?: {
    companyId?: number | null;
    branchId?: number | null;
  };
  link?: {
    entityType?: string | null;
    entityId?: number | null;
    actionUrl?: string | null;
  };
  metadata?: Record<string, unknown> | null;
}

export interface NotificationChannelOptions {
  inApp?: boolean;
  push?: boolean;
  email?: boolean;
}

@Injectable()
export class NotificationEventsService {
  constructor(private readonly notificationsService: NotificationsService) {}

  async notify(event: NotificationEventPayload) {
    const input = this.toNotificationInput(event);

    if (event.recipients.userId) {
      return this.notificationsService.createForUser({
        userId: event.recipients.userId,
        ...input,
      });
    }

    return this.notificationsService.createForUsers(event.recipients.userIds || [], input);
  }

  async notifyUser(input: NotificationEventInput, channels?: NotificationChannelOptions) {
    return this.notificationsService.createForUser(this.withChannelDefaults(input, channels));
  }

  async notifyUsers(userIds: number[], input: Omit<NotificationEventInput, 'userId'>, channels?: NotificationChannelOptions) {
    return this.notificationsService.createForUsers(userIds, this.withChannelDefaults(input, channels));
  }

  async createForUser(input: NotificationEventInput) {
    return this.notifyUser(input);
  }

  async createForUsers(userIds: number[], input: Omit<NotificationEventInput, 'userId'>) {
    return this.notifyUsers(userIds, input);
  }

  async notifyOrderCreated(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'ORDER_CREATED' }, channels);
  }

  async notifyOrderApprovalRequired(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'ORDER_APPROVAL_REQUIRED' }, channels);
  }

  async notifyOrderStatusChanged(input: NotificationEventInput, channels?: NotificationChannelOptions) {
    return this.notifyUser(input, channels);
  }

  async notifyPricingUpdated(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'PRICING_UPDATED' }, channels);
  }

  async notifyProductImportFailed(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'PRODUCT_IMPORT_FAILED' }, channels);
  }

  async notifySpiffClaimSubmitted(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'SPIFF_CLAIM_SUBMITTED' }, channels);
  }

  async notifySpiffClaimReviewRequired(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'SPIFF_CLAIM_REVIEW_REQUIRED' }, channels);
  }

  async notifySpiffClaimUpdated(input: NotificationEventInput, channels?: NotificationChannelOptions) {
    return this.notifyUser(input, channels);
  }

  async notifySpiffClaimUpdatedForManagers(userIds: number[], input: Omit<NotificationEventInput, 'userId'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, input, channels);
  }

  async notifySpiffPointsGiven(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'SPIFF_POINTS_GIVEN' }, channels);
  }

  async notifyUserAccountCreated(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'USER_ACCOUNT_CREATED' }, channels);
  }

  async notifyUserAccountCreatedForAdmins(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'USER_ACCOUNT_CREATED' }, channels);
  }

  async notifyUserRoleChanged(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'USER_ROLE_CHANGED' }, channels);
  }

  async notifyUserRoleChangedForAdmins(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'USER_ROLE_CHANGED' }, channels);
  }

  private toNotificationInput(event: NotificationEventPayload): Omit<CreateNotificationInput, 'userId'> {
    return this.withChannelDefaults({
      type: event.activity,
      priority: event.priority,
      title: event.content.title,
      message: event.content.message,
      companyId: event.scope?.companyId ?? null,
      branchId: event.scope?.branchId ?? null,
      entityType: event.link?.entityType ?? null,
      entityId: event.link?.entityId ?? null,
      actionUrl: event.link?.actionUrl ?? null,
      metadata: event.metadata ?? null,
    }, event.channels);
  }

  private withChannelDefaults<T extends Partial<CreateNotificationInput>>(input: T, channels?: NotificationChannelOptions): T {
    return {
      channelInApp: channels?.inApp ?? input.channelInApp ?? true,
      channelPush: channels?.push ?? input.channelPush ?? false,
      channelEmail: channels?.email ?? input.channelEmail ?? false,
      ...input,
    };
  }
}