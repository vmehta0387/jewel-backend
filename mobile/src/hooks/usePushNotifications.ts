import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  canReceivePushForRole,
  recordPushRegistrationDebug,
  registerForPushNotificationsAsync,
  registerRotatedPushToken,
  unregisterLastPushToken,
  type PushNotificationData,
} from '../services/pushNotifications';
import type { UserRole } from '../types';

type UsePushNotificationsOptions = {
  token: string | null;
  userId?: string | null;
  role?: UserRole;
  deviceId: string | null;
  onNotificationReceived?: (data: PushNotificationData) => void;
  onNotificationResponse?: (data: PushNotificationData) => void;
};

export const usePushNotifications = ({
  token,
  userId,
  role,
  deviceId,
  onNotificationReceived,
  onNotificationResponse,
}: UsePushNotificationsOptions) => {
  const registeredPushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !userId || !canReceivePushForRole(role)) {
      registeredPushTokenRef.current = null;
      return undefined;
    }

    if (!deviceId) {
      void recordPushRegistrationDebug('waiting_for_device_id', { userId });
      return undefined;
    }

    let isMounted = true;

    const registerDevice = async () => {
      try {
        const pushToken = await registerForPushNotificationsAsync(token, deviceId);
        if (!isMounted || !pushToken) {
          return;
        }
        registeredPushTokenRef.current = pushToken;
      } catch (err: any) {
        await recordPushRegistrationDebug('failed', { message: err?.message || String(err), status: err?.status || null });
      }
    };

    void registerDevice();

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const data = (notification.request.content.data || {}) as PushNotificationData;
      onNotificationReceived?.(data);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data || {}) as PushNotificationData;
      onNotificationResponse?.(data);
    });

    const pushTokenSubscription = Notifications.addPushTokenListener((pushToken) => {
      const expoPushToken = pushToken.data;
      if (!expoPushToken) return;
      registeredPushTokenRef.current = expoPushToken;
      void registerRotatedPushToken(token, expoPushToken, deviceId).catch(() => undefined);
    });

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void registerDevice();
      }
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response) {
        return;
      }
      const data = (response.notification.request.content.data || {}) as PushNotificationData;
      onNotificationResponse?.(data);
    });

    return () => {
      isMounted = false;
      receivedSubscription.remove();
      responseSubscription.remove();
      pushTokenSubscription.remove();
      appStateSubscription.remove();
      const registeredPushToken = registeredPushTokenRef.current;
      registeredPushTokenRef.current = null;
      void unregisterLastPushToken(token, registeredPushToken);
    };
  }, [deviceId, onNotificationReceived, onNotificationResponse, role, token, userId]);
};
