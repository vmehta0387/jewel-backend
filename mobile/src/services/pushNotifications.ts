import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushDevice, unregisterPushDevice } from '../api/notifications';
import type { UserRole } from '../types';

const PUSH_REGISTRATION_DEBUG_KEY = 'push_registration_debug';
const LAST_REGISTERED_PUSH_TOKEN_KEY = 'last_registered_expo_push_token';

export type PushNotificationData = Record<string, unknown>;

export const canReceivePushForRole = (role?: UserRole) =>
  role === 'BRANCH_MANAGER' || role === 'SALES_REP';

export const configurePushNotificationPresentation = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

export const recordPushRegistrationDebug = async (status: string, details?: Record<string, unknown>) => {
  const payload = {
    status,
    details: details || {},
    platform: Platform.OS,
    at: new Date().toISOString(),
  };
  console.warn('[push-registration]', payload);
  await AsyncStorage.setItem(PUSH_REGISTRATION_DEBUG_KEY, JSON.stringify(payload)).catch(() => undefined);
};

export const getLastRegisteredPushToken = () =>
  AsyncStorage.getItem(LAST_REGISTERED_PUSH_TOKEN_KEY).catch(() => null);

const setLastRegisteredPushToken = (expoPushToken: string) =>
  AsyncStorage.setItem(LAST_REGISTERED_PUSH_TOKEN_KEY, expoPushToken).catch(() => undefined);

const clearLastRegisteredPushToken = () =>
  AsyncStorage.removeItem(LAST_REGISTERED_PUSH_TOKEN_KEY).catch(() => undefined);

const getAppVersion = () =>
  Constants.expoConfig?.version || Constants.manifest2?.extra?.expoClient?.version || '1.0.0';

const getExpoProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId
  || (Constants as any)?.easConfig?.projectId
  || undefined;

export const registerForPushNotificationsAsync = async (authToken: string, deviceId: string) => {
  if (!Device.isDevice) {
    await recordPushRegistrationDebug('skipped_not_physical_device');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('blitz-alerts', {
      name: 'BLITZ alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD54A',
    });

    await Notifications.setNotificationChannelAsync('spiff-rewards', {
      name: 'SPIFF rewards',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 180, 120, 180, 120, 280],
      lightColor: '#FFD54A',
      sound: 'spiff_coin.wav',
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let status = currentPermissions.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    await recordPushRegistrationDebug('permission_not_granted', { status });
    return null;
  }

  const projectId = getExpoProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const expoPushToken = tokenResponse.data;
  if (!expoPushToken) {
    await recordPushRegistrationDebug('expo_token_empty', { projectId: projectId || null });
    return null;
  }

  await registerPushDevice(authToken, {
    expoPushToken,
    platform: Platform.OS,
    deviceId,
    appVersion: getAppVersion(),
  });
  await setLastRegisteredPushToken(expoPushToken);
  await recordPushRegistrationDebug('registered', {
    projectId: projectId || null,
    deviceId,
    tokenPrefix: expoPushToken.slice(0, 22),
  });

  return expoPushToken;
};

export const registerRotatedPushToken = async (authToken: string, expoPushToken: string, deviceId: string) => {
  await registerPushDevice(authToken, {
    expoPushToken,
    platform: Platform.OS,
    deviceId,
    appVersion: getAppVersion(),
  });
  await setLastRegisteredPushToken(expoPushToken);
};

export const unregisterLastPushToken = async (authToken: string, fallbackPushToken?: string | null) => {
  const expoPushToken = fallbackPushToken || await getLastRegisteredPushToken();
  if (!expoPushToken) {
    return;
  }

  await unregisterPushDevice(authToken, expoPushToken).catch(() => undefined);
  await clearLastRegisteredPushToken();
};
