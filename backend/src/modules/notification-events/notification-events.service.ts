import { Injectable, Logger } from '@nestjs/common';
import { CreateNotificationInput, NotificationsService } from '../notifications/notifications.service';

export type NotificationActivity =
  | 'ORDER_CREATED'
  | 'ORDER_SUBMITTED'
  | 'ORDER_APPROVAL_REQUIRED'
  | 'ORDER_APPROVED'
  | 'ORDER_ON_HOLD'
  | 'ORDER_IN_PRODUCTION'
  | 'ORDER_SHIPPED'
  | 'ORDER_COMPLETED'
  | 'ORDER_CANCELLED'
  | 'ORDER_REVISED'
  | 'COLLECTION_ACCESS_GRANTED'
  | 'PRICING_TIER_CHANGED'
  | 'PRICING_UPDATED'
  | 'PROMO_SPIFF_WINDOW_CHANGED'
  | 'PRODUCT_IMPORT_FAILED'
  | 'SPIFF_CAMPAIGN_LIVE'
  | 'SPIFF_EARNED'
  | 'SPIFF_LEADERBOARD_MOVEMENT'
  | 'SPIFF_PACE_NUDGE'
  | 'SPIFF_EXPIRING_SOON'
  | 'SPIFF_PERIOD_RESET'
  | 'SPIFF_CLAIM_SUBMITTED'
  | 'SPIFF_CLAIM_REVIEW_REQUIRED'
  | 'SPIFF_CLAIM_APPROVED'
  | 'SPIFF_CLAIM_REJECTED'
  | 'SPIFF_CLAIM_HOLD'
  | 'SPIFF_CLAIM_FULFILLED'
  | 'SPIFF_POINTS_GIVEN'
  | 'USER_ACCOUNT_CREATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_INVITE_ACTIVITY'
  | 'USER_ACCESS_CHANGED'
  | 'TENANT_ONBOARDED'
  | 'SERVICE_DEGRADATION'
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

export const NotificationChannels = {
  inAppOnly: { inApp: true, push: false, email: false },
  inAppPush: { inApp: true, push: true, email: false },
  inAppEmail: { inApp: true, push: false, email: true },
  inAppPushEmail: { inApp: true, push: true, email: true },
  emailOnly: { inApp: false, push: false, email: true },
  pushEmail: { inApp: false, push: true, email: true },
} as const satisfies Record<string, NotificationChannelOptions>;

@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

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
    const resolved = this.withChannelDefaults(input, channels);
    this.logger.log('Notification event userId=' + resolved.userId + ' type=' + resolved.type + ' channels=inApp:' + Boolean(resolved.channelInApp) + ' push:' + Boolean(resolved.channelPush) + ' email:' + Boolean(resolved.channelEmail) + ' entity=' + (resolved.entityType || '-') + ':' + (resolved.entityId || '-'));
    return this.notificationsService.createForUser(resolved);
  }

  async notifyUsers(userIds: number[], input: Omit<NotificationEventInput, 'userId'>, channels?: NotificationChannelOptions) {
    const resolved = this.withChannelDefaults(input, channels);
    this.logger.log('Notification event users=' + userIds.length + ' type=' + resolved.type + ' channels=inApp:' + Boolean(resolved.channelInApp) + ' push:' + Boolean(resolved.channelPush) + ' email:' + Boolean(resolved.channelEmail) + ' entity=' + (resolved.entityType || '-') + ':' + (resolved.entityId || '-'));
    return this.notificationsService.createForUsers(userIds, resolved);
  }

  async createForUser(input: NotificationEventInput) {
    return this.notifyUser(input);
  }

  async createForUsers(userIds: number[], input: Omit<NotificationEventInput, 'userId'>) {
    return this.notifyUsers(userIds, input);
  }

  async notifyOrderCreated(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'ORDER_CREATED' }, channels ?? NotificationChannels.inAppPushEmail);
  }

  async notifyOrderSubmitted(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'ORDER_SUBMITTED' }, channels ?? NotificationChannels.inAppPushEmail);
  }

  async notifyOrderApprovalRequired(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'ORDER_APPROVAL_REQUIRED' }, channels ?? NotificationChannels.inAppPush);
  }

  async notifyOrderStatusChanged(input: NotificationEventInput, channels?: NotificationChannelOptions) {
    return this.notifyUser(input, channels ?? NotificationChannels.inAppPush);
  }

  async notifyOrderInProduction(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'ORDER_IN_PRODUCTION' }, channels ?? NotificationChannels.inAppPush);
  }

  async notifyOrderShipped(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'ORDER_SHIPPED' }, channels ?? NotificationChannels.inAppPushEmail);
  }

  async notifyOrderCancelled(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'ORDER_CANCELLED' }, channels ?? NotificationChannels.inAppPushEmail);
  }

  async notifyOrderRevised(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'ORDER_REVISED' }, channels ?? NotificationChannels.inAppOnly);
  }

  async notifyPricingUpdated(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'PRICING_UPDATED' }, channels ?? NotificationChannels.inAppEmail);
  }

  async notifyPricingTierChanged(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'PRICING_TIER_CHANGED' }, channels ?? NotificationChannels.inAppEmail);
  }

  async notifyCollectionAccessGranted(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'COLLECTION_ACCESS_GRANTED' }, channels ?? NotificationChannels.inAppPush);
  }

  async notifyProductImportFailed(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'PRODUCT_IMPORT_FAILED' }, channels ?? NotificationChannels.inAppOnly);
  }

  async notifySpiffCampaignLive(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'SPIFF_CAMPAIGN_LIVE' }, channels ?? NotificationChannels.inAppPush);
  }

  async notifySpiffEarned(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'SPIFF_EARNED' }, channels ?? NotificationChannels.inAppPush);
  }

  async notifySpiffLeaderboardMovement(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'SPIFF_LEADERBOARD_MOVEMENT' }, channels ?? NotificationChannels.inAppOnly);
  }

  async notifySpiffPaceNudge(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'SPIFF_PACE_NUDGE' }, channels ?? NotificationChannels.inAppOnly);
  }

  async notifySpiffExpiringSoon(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'SPIFF_EXPIRING_SOON' }, channels ?? NotificationChannels.inAppPush);
  }

  async notifySpiffPeriodReset(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'SPIFF_PERIOD_RESET' }, channels ?? NotificationChannels.inAppOnly);
  }

  async notifySpiffClaimSubmitted(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'SPIFF_CLAIM_SUBMITTED' }, channels ?? NotificationChannels.inAppPushEmail);
  }

  async notifySpiffClaimReviewRequired(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'SPIFF_CLAIM_REVIEW_REQUIRED' }, channels ?? NotificationChannels.inAppPushEmail);
  }

  async notifySpiffClaimUpdated(input: NotificationEventInput, channels?: NotificationChannelOptions) {
    return this.notifyUser(input, channels ?? NotificationChannels.inAppPushEmail);
  }

  async notifySpiffClaimUpdatedForManagers(userIds: number[], input: Omit<NotificationEventInput, 'userId'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, input, channels ?? NotificationChannels.inAppPushEmail);
  }

  async notifySpiffPointsGiven(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'SPIFF_POINTS_GIVEN' }, channels ?? NotificationChannels.inAppPush);
  }

  async notifyUserAccountCreated(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'USER_ACCOUNT_CREATED' }, channels ?? NotificationChannels.emailOnly);
  }

  async notifyUserAccountCreatedForAdmins(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'USER_ACCOUNT_CREATED' }, channels ?? NotificationChannels.inAppOnly);
  }

  async notifyUserRoleChanged(input: Omit<NotificationEventInput, 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUser({ ...input, type: 'USER_ROLE_CHANGED' }, channels ?? NotificationChannels.inAppEmail);
  }

  async notifyUserRoleChangedForAdmins(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'USER_ROLE_CHANGED' }, channels ?? NotificationChannels.inAppOnly);
  }

  async notifyUserAccessChanged(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'USER_ACCESS_CHANGED' }, channels ?? NotificationChannels.inAppEmail);
  }

  async notifyTenantOnboarded(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'TENANT_ONBOARDED' }, channels ?? NotificationChannels.inAppEmail);
  }

  async notifyServiceDegradation(userIds: number[], input: Omit<NotificationEventInput, 'userId' | 'type'>, channels?: NotificationChannelOptions) {
    return this.notifyUsers(userIds, { ...input, type: 'SERVICE_DEGRADATION' }, channels ?? NotificationChannels.pushEmail);
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
      ...input,
      channelInApp: channels?.inApp ?? input.channelInApp ?? true,
      channelPush: channels?.push ?? input.channelPush ?? false,
      channelEmail: channels?.email ?? input.channelEmail ?? false,
    };
  }
}
