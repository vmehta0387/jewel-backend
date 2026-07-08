import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createNotificationsSocket, type NotificationUnreadCountPayload } from '../api/notificationSocket';
import { useAuth } from './AuthContext';

type NotificationContextValue = {
  unreadCount: number;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const NOTIFICATION_ROLES = new Set(['BRANCH_MANAGER', 'SALES_REP', 'COMPANY_ADMIN']);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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

    return () => {
      socket.off('notification.unread_count_updated', handleUnreadCountUpdate);
      socket.disconnect();
    };
  }, [token, user]);

  const value = useMemo(() => ({ unreadCount }), [unreadCount]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
