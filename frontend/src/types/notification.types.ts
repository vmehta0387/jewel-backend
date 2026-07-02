export type NotificationPriority = 'P0' | 'P1' | 'P2';

export interface NotificationItem {
  id: string;
  type: string;
  priority: NotificationPriority;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  channelInApp?: boolean;
  channelEmail?: boolean;
  channelPush?: boolean;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  metadata?: Record<string, unknown> | null;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}

