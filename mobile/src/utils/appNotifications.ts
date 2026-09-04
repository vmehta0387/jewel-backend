import type { NotificationItem } from '../types';

export type NotificationTone = 'alertGold' | 'alertRed' | 'neutral' | 'info' | 'promo';

export type NotificationFeedEntry = {
  id: string;
  notificationId: string;
  title: string;
  subtitle: string;
  time: string;
  tone: NotificationTone;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  sortDate: Date;
};

export const formatNotificationTime = (date?: string | null) => {
  if (!date) return 'Just now';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Just now';

  const diffMs = Date.now() - parsed.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return parsed.toLocaleDateString();
};

const getTone = (item: NotificationItem): NotificationTone => {
  const type = String(item.type || '').toUpperCase();
  if (item.priority === 'P0' || type.includes('CANCELLED') || type.includes('REJECTED') || type.includes('HOLD')) {
    return 'alertRed';
  }
  if (type.includes('APPROVAL_REQUIRED') || type.includes('PENDING_APPROVAL') || type.includes('APPROVED')) {
    return 'alertGold';
  }
  if (type.includes('FULFILLED') || type.includes('COMPLETED')) {
    return 'info';
  }
  if (type.includes('CREATED') || type.includes('SUBMITTED')) {
    return 'promo';
  }
  return 'neutral';
};

export const mapNotificationsToEntries = (items: NotificationItem[]): NotificationFeedEntry[] =>
  items
    .filter((item) => String(item.type || '').toUpperCase() !== 'DESIGN_UPDATED')
    .map((item) => ({
      id: item.id,
      notificationId: item.id,
      title: String(item.title || '').trim() || 'Notification',
      subtitle: String(item.message || '').trim() || 'Open to view details',
      time: formatNotificationTime(item.createdAt),
      tone: getTone(item),
      entityType: item.entityType ?? null,
      entityId: item.entityId ?? null,
      actionUrl: item.actionUrl ?? null,
      metadata: item.metadata ?? null,
      isRead: Boolean(item.isRead),
      createdAt: item.createdAt,
    }));

export const mapNotificationsToActivityItems = (items: NotificationItem[]): NotificationActivityItem[] =>
  mapNotificationsToEntries(items).map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    time: item.time,
    sortDate: new Date(item.createdAt || Date.now()),
  }));

export const getOrderIdFromNotification = (entry: Pick<NotificationFeedEntry, 'entityType' | 'entityId' | 'metadata'>) => {
  if (String(entry.entityType || '').toUpperCase() === 'ORDER') {
    return String(entry.entityId || (entry.metadata as any)?.orderId || '').trim() || null;
  }
  return null;
};

export const getSpiffClaimTargetFromNotification = (
  entry: Pick<NotificationFeedEntry, 'entityType' | 'entityId' | 'metadata'>,
) => {
  if (String(entry.entityType || '').toUpperCase() !== 'SPIFF_CLAIM') {
    return null;
  }

  const metadata = (entry.metadata as Record<string, unknown> | null) || null;
  const claimId = String(entry.entityId || metadata?.claimId || '').trim() || undefined;
  const claimNumber = String(metadata?.claimNumber || '').trim() || undefined;

  if (!claimId && !claimNumber) {
    return null;
  }

  return { claimId, claimNumber };
};
export const isSpiffNotification = (
  entry: Pick<NotificationFeedEntry, 'entityType' | 'actionUrl' | 'metadata'>,
) => {
  const entityType = String(entry.entityType || '').trim().toUpperCase();
  const actionUrl = normalizeActionUrl(entry.actionUrl);
  const metadata = (entry.metadata as Record<string, unknown> | null) || null;
  const metadataType = String(metadata?.type || metadata?.entityType || '').trim().toUpperCase();

  return (
    entityType.startsWith('SPIFF') ||
    metadataType.startsWith('SPIFF') ||
    actionUrl === 'spiff' ||
    actionUrl === '/spiff' ||
    actionUrl.startsWith('spiff/') ||
    actionUrl.startsWith('/spiff/')
  );
};
export type NotificationNavigationTarget =
  | { tab: 'OrdersTab'; screen: 'OrderDetail'; params: { orderId: string } }
  | { tab: 'DashboardTab'; screen: 'SpiffRewards'; params?: { claimId?: string; claimNumber?: string; initialPanel?: 'ACTIVITY' | 'REDEEM' | 'COMPANY_BOARD' | 'GLOBAL_BOARD' } }
  | { tab: 'DashboardTab'; screen: 'UserProfile'; params?: undefined }
  | { tab: 'PricingTab'; screen?: undefined; params?: undefined };

type NotificationNavigationSource = Pick<NotificationFeedEntry, 'entityType' | 'entityId' | 'actionUrl' | 'metadata'>;

const normalizeActionUrl = (value?: string | null) => String(value || '').trim().toLowerCase();

const getOrderIdFromActionUrl = (actionUrl?: string | null) => {
  const match = normalizeActionUrl(actionUrl).match(/^\/orders\/([^/?#]+)/);
  return match?.[1] || null;
};

export const getNotificationNavigationTarget = (entry: NotificationNavigationSource): NotificationNavigationTarget | null => {
  const orderId = getOrderIdFromNotification(entry) || getOrderIdFromActionUrl(entry.actionUrl);
  if (orderId) {
    return { tab: 'OrdersTab', screen: 'OrderDetail', params: { orderId } };
  }

  const spiffTarget = getSpiffClaimTargetFromNotification(entry);
  const actionUrl = normalizeActionUrl(entry.actionUrl);
  if (spiffTarget || isSpiffNotification(entry)) {
    return {
      tab: 'DashboardTab',
      screen: 'SpiffRewards',
      params: spiffTarget || { initialPanel: 'ACTIVITY' },
    };
  }

  if (actionUrl === '/pricing' || actionUrl.startsWith('/pricing/')) {
    return { tab: 'PricingTab' };
  }

  if (actionUrl === '/profile' || actionUrl.startsWith('/profile/')) {
    return { tab: 'DashboardTab', screen: 'UserProfile' };
  }

  return null;
};
