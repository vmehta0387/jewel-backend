import api from './api';
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationUnreadCountResponse,
} from '../types/notification.types';

export const fetchNotifications = async (page = 1, limit = 20, unreadOnly = false) => {
  return fetchNotificationsWithFilters(page, limit, unreadOnly);
};

export const fetchNotificationsWithFilters = async (
  page = 1,
  limit = 20,
  unreadOnly = false,
  search = '',
  section?: 'ALERTS' | 'UPDATES',
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (unreadOnly) {
    params.set('unreadOnly', 'true');
  }

  if (search.trim()) {
    params.set('search', search.trim());
  }

  if (section) {
    params.set('section', section);
  }

  const response = await api.get<NotificationListResponse>(`/notifications?${params.toString()}`);
  return response.data;
};

export const fetchUnreadNotificationCount = async () => {
  const response = await api.get<NotificationUnreadCountResponse>('/notifications/unread-count');
  return response.data;
};

export const markNotificationRead = async (id: string, isRead = true) => {
  const response = await api.patch<NotificationItem>(`/notifications/${id}/read`, { isRead });
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.patch<NotificationUnreadCountResponse>('/notifications/read-all', {});
  return response.data;
};
