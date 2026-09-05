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
  const registeredSessionRef = useRef<{ authToken: string; userId: string; pushToken: string | null } | null>(null);

  useEffect(() => {
    const previousSession = registeredSessionRef.current;
    if (previousSession && (!token || !userId || !canReceivePushForRole(role) || previousSession.userId !== String(userId))) {
      registeredSessionRef.current = null;
      void unregisterLastPushToken(previousSession.authToken, previousSession.pushToken);
    }

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
        registeredSessionRef.current = { authToken: token, userId: String(userId), pushToken };
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
      registeredSessionRef.current = { authToken: token, userId: String(userId), pushToken: expoPushToken };
      void registerRotatedPushToken(token, expoPushToken, deviceId).catch((err: any) => {
        void recordPushRegistrationDebug('rotated_token_registration_failed', {
          message: err?.message || String(err),
          status: err?.status || null,
          tokenSuffix: expoPushToken.slice(-8),
        });
      });
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
      registeredPushTokenRef.current = null;
    };
  }, [deviceId, onNotificationReceived, onNotificationResponse, role, token, userId]);
};
