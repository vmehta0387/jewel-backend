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
