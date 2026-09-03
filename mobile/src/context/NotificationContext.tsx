import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createNotificationsSocket, type NotificationUnreadCountPayload } from '../api/notificationSocket';
import { fetchUnreadNotificationCount } from '../api/notifications';
import { useAuth } from './AuthContext';

type NotificationContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  adjustUnreadCount: (delta: number) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const NOTIFICATION_ROLES = new Set(['BRANCH_MANAGER', 'SALES_REP', 'COMPANY_ADMIN']);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const adjustUnreadCount = useCallback((delta: number) => {
    setUnreadCount((current) => Math.max(0, current + delta));
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await fetchUnreadNotificationCount(token);
      const nextCount = Number(response?.unreadCount || 0);
      setUnreadCount(Number.isFinite(nextCount) ? nextCount : 0);
    } catch {
      // Socket updates and notification list fetches can still recover the count.
    }
  }, [token]);

  useEffect(() => {
    const canReceiveUpdates = Boolean(token && user && NOTIFICATION_ROLES.has(user.role));
    if (!canReceiveUpdates || !token) {
      setUnreadCount(0);
      return undefined;
    }

    const socket = createNotificationsSocket(token);
    const handleUnreadCountUpdate = (payload: NotificationUnreadCountPayload) => {
      const nextCount = Number(payload?.unreadCount || 0);
      setUnreadCount(Number.isFinite(nextCount) ? nextCount : 0);
    };

    socket.on('notification.unread_count_updated', handleUnreadCountUpdate);
    void refreshUnreadCount();

    return () => {
      socket.off('notification.unread_count_updated', handleUnreadCountUpdate);
      socket.disconnect();
    };
  }, [refreshUnreadCount, token, user]);

  const value = useMemo(() => ({ unreadCount, refreshUnreadCount, adjustUnreadCount }), [adjustUnreadCount, refreshUnreadCount, unreadCount]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
