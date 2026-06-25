import { apiRequest } from './client';
import type { NotificationItem, NotificationListResponse, NotificationUnreadCountResponse } from '../types';

export const fetchNotifications = (
  token: string,
  page = 1,
  limit = 25,
  unreadOnly = false,
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (unreadOnly) {
    params.set('unreadOnly', 'true');
  }

  return apiRequest<NotificationListResponse>(`/notifications?${params.toString()}`, { method: 'GET' }, token);
};

export const fetchUnreadNotificationCount = (token: string) =>
  apiRequest<NotificationUnreadCountResponse>('/notifications/unread-count', { method: 'GET' }, token);

export const markNotificationRead = (token: string, id: string, isRead = true) =>
  apiRequest<NotificationItem>(`/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead }),
  }, token);

export const markAllNotificationsRead = (token: string) =>
  apiRequest<NotificationUnreadCountResponse>('/notifications/read-all', {
    method: 'PATCH',
    body: JSON.stringify({}),
  }, token);
