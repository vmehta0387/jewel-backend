import { apiRequest } from './client';

export type NotificationTone = 'gold' | 'blue' | 'green' | 'rose';
export type NotificationCategory = 'ORDER' | 'UPDATE';

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  icon: string;
  tone: NotificationTone;
  category: NotificationCategory;
  createdAt: string;
  isUnread: boolean;
  orderId?: string | null;
  designId?: string | null;
};

export type NotificationsResponse = {
  data: NotificationItem[];
  total: number;
  unread: number;
};

export const fetchNotifications = (token: string, limit = 12) => {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiRequest<NotificationsResponse>(`/orders/notifications?${params.toString()}`, { method: 'GET' }, token);
};
