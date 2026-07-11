import { apiRequest } from './client';
import type {
  NotificationItem,
  NotificationListResponse,
  PushDeviceRegistrationResponse,
} from '../types';

export const fetchNotifications = (
  token: string,
  page = 1,
  limit = 25,
  unreadOnly = false,
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    unreadOnly: String(unreadOnly),
  });

  return apiRequest<NotificationListResponse>(`/notifications?${params.toString()}`, { method: 'GET' }, token);
};

export const markNotificationRead = (token: string, id: string, isRead = true) =>
  apiRequest<NotificationItem>(`/notifications/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead }),
  }, token);

export const markAllNotificationsRead = (token: string) =>
  apiRequest<{ unreadCount: number }>('/notifications/read-all', {
    method: 'PATCH',
    body: JSON.stringify({}),
  }, token);

export const registerPushDevice = (
  token: string,
  payload: {
    expoPushToken: string;
    platform?: string;
    deviceId?: string;
    appVersion?: string;
  },
) =>
  apiRequest<PushDeviceRegistrationResponse>('/notifications/push/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);

export const unregisterPushDevice = (token: string, expoPushToken: string) =>
  apiRequest<PushDeviceRegistrationResponse>('/notifications/push/unregister', {
    method: 'POST',
    body: JSON.stringify({ expoPushToken }),
  }, token);
