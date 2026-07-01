import Constants from 'expo-constants';
import { Platform } from 'react-native';

const fallbackUrl = 'http://localhost:3000/api';
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

  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:3000/api`;
  }

  return undefined;
};

const resolved = getWebApiBaseUrl() || envUrl || extraUrl || fallbackUrl;

export const API_BASE_URL = resolved.replace(/\/$/, '');
