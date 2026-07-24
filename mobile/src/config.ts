import Constants from 'expo-constants';
import { Platform } from 'react-native';

const liveApiUrl = 'https://api.blitznyc.com/api';
const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const webEnvUrl = process.env.EXPO_PUBLIC_WEB_API_BASE_URL;
const extraUrl = Constants.expoConfig?.extra?.apiBaseUrl;

const getWebApiBaseUrl = () => {
  if (Platform.OS !== 'web') {
    return undefined;
  }

  if (webEnvUrl) {
    return webEnvUrl;
  }

  return undefined;
};

const resolved = getWebApiBaseUrl() || envUrl || extraUrl || liveApiUrl;

export const API_BASE_URL = resolved.replace(/\/$/, '');

export const APP_VERSION = '1.0.1';

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.clariondiamonds.blitznyc';
export const APP_STORE_URL = 'https://apps.apple.com/app/id6470000000'; // Replace with real App ID when published

export const isVersionOutdated = (local: string, latest: string): boolean => {
  const localParts = local.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  for (let i = 0; i < Math.max(localParts.length, latestParts.length); i++) {
    const localVal = localParts[i] || 0;
    const latestVal = latestParts[i] || 0;
    if (latestVal > localVal) return true;
    if (latestVal < localVal) return false;
  }
  return false;
};
