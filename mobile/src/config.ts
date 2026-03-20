import Constants from 'expo-constants';

const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const extraUrl =
  typeof Constants.expoConfig?.extra?.apiBaseUrl === 'string'
    ? Constants.expoConfig.extra.apiBaseUrl.trim()
    : undefined;

const resolved = envUrl || extraUrl;

if (!resolved) {
  throw new Error('Missing EXPO_PUBLIC_API_BASE_URL in mobile/.env');
}

export const API_BASE_URL = resolved.replace(/\/$/, '');
