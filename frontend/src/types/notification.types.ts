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


export type CustomNotificationActivityType = 'GENERAL' | 'ORDER' | 'DESIGN';

export interface CustomNotificationRecordOption {
  id: number;
  label: string;
}

export interface SendCustomNotificationPayload {
  title: string;
  message: string;
  activityType: CustomNotificationActivityType;
  activityRecordId?: number;
  priority?: NotificationPriority;
  channelPush?: boolean;
}

export interface SendCustomNotificationResponse {
  success: boolean;
  targetUsers: number;
  createdNotifications: number;
}

