import Constants from 'expo-constants';

const fallbackUrl = 'http://localhost:8000/api';
const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const extraUrl = Constants.expoConfig?.extra?.apiBaseUrl;

const resolved = (envUrl || extraUrl || fallbackUrl).replace(/\/$/, '');

export const API_BASE_URL = resolved;
