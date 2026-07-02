import { io, Socket } from 'socket.io-client';
import api from './api';

export type NotificationUnreadCountPayload = {
  unreadCount?: number;
};

const getSocketBaseUrl = () => {
  const baseUrl = api.defaults.baseURL || '';
  return baseUrl.replace(/\/api\/?$/, '');
};

export const createNotificationsSocket = (token: string): Socket => {
  return io(`${getSocketBaseUrl()}/notifications`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
};
