import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config';

export type NotificationUnreadCountPayload = {
  unreadCount?: number;
};

const getSocketBaseUrl = () => API_BASE_URL.replace(/\/api\/?$/, '');

export const createNotificationsSocket = (token: string): Socket => {
  return io(`${getSocketBaseUrl()}/notifications`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
};
