import { trackActivity } from './activityTracker';
import type { AuditChange } from './changeDiff';

type Data = Record<string, unknown>;

export const trackDesignListViewed = (data?: Data) =>
  trackActivity('Design', 'LIST_VIEWED', { screen: 'DesignList', data });

export const trackDesignPageLoaded = (page: number, data?: Data) =>
  trackActivity('Design', 'PAGE_LOADED', { screen: 'DesignList', data: { page, ...data } });

export const trackDesignFilterApplied = (filters: Data) =>
  trackActivity('Design', 'FILTER_APPLIED', { screen: 'DesignList', data: { filters } });

export const trackDesignViewed = (designId: string | number, data?: Data) =>
  trackActivity('Design', 'DETAIL_VIEWED', {
    screen: 'DesignDetail',
    entityType: 'Design',
    entityId: designId,
    data,
  });

export const trackDesignOptionsChanged = (designId: string | number, changes: AuditChange[]) => {
  if (changes.length === 0) return;
  trackActivity('Design', 'OPTIONS_CHANGED', {
    screen: 'DesignDetail',
    entityType: 'Design',
    entityId: designId,
    changes,
  });
};

export const trackCreateOrderStarted = (designId: string | number, data?: Data) =>
  trackActivity('Design', 'CREATE_ORDER_STARTED', {
    screen: 'DesignDetail',
    entityType: 'Design',
    entityId: designId,
    data,
  });

export const trackOrderListViewed = (data?: Data) =>
  trackActivity('Order', 'LIST_VIEWED', { screen: 'OrderList', data });

export const trackOrderFilterApplied = (filters: Data) =>
  trackActivity('Order', 'FILTER_APPLIED', { screen: 'OrderList', data: { filters } });

export const trackOrderViewed = (orderId: string | number, data?: Data) =>
  trackActivity('Order', 'DETAIL_VIEWED', {
    screen: 'OrderDetail',
    entityType: 'Order',
    entityId: orderId,
    data,
  });

export const trackOrderChanged = (orderId: string | number, changes: AuditChange[]) => {
  if (changes.length === 0) return;
  trackActivity('Order', 'ORDER_CHANGED', {
    screen: 'OrderDetail',
    entityType: 'Order',
    entityId: orderId,
    changes,
  });
};

export const trackOrderCreated = (orderId: string | number, data?: Data) =>
  trackActivity('Order', 'ORDER_CREATED', {
    screen: 'OrderCreate',
    entityType: 'Order',
    entityId: orderId,
    data,
  });

export const trackNotificationListViewed = (data?: Data) =>
  trackActivity('Notification', 'LIST_VIEWED', { screen: 'Notifications', data });

export const trackNotificationViewed = (notificationId: string | number, data?: Data) =>
  trackActivity('Notification', 'DETAIL_VIEWED', {
    screen: 'Notifications',
    entityType: 'Notification',
    entityId: notificationId,
    data,
  });

export const trackNotificationAction = (notificationId: string | number, action: string, data?: Data) =>
  trackActivity('Notification', action, {
    screen: 'Notifications',
    entityType: 'Notification',
    entityId: notificationId,
    data,
  });
