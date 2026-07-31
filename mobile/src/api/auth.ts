import { Platform } from 'react-native';
import { apiRequest } from './client';
import type { AuthUser } from '../types';

export type LoginResponse = { accessToken: string; user: AuthUser };

export const login = (email: string, password: string) =>
  apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, clientPlatform: 'MOBILE_APP' }),
  });

export const signup = (data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}) =>
  apiRequest<LoginResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export type MobileConfig = {
  status: boolean;
  current_version: {
    android: string;
    ios: string;
    by_pass: boolean;
  };
  signup: boolean;
};

export const getMobileConfig = () =>
  apiRequest<MobileConfig>('/auth/config', {
    method: 'GET',
  });

export const me = (token: string) =>
  apiRequest<AuthUser>('/auth/me', { method: 'GET' }, token);

export const uploadMyPhoto = (
  token: string,
  file: { uri: string; name: string; type: string },
) => {
  const formData = new FormData();

  const upload = async () => {
    if (Platform.OS === 'web') {
      const imageResponse = await fetch(file.uri);
      if (!imageResponse.ok) {
        throw new Error('Unable to read the selected image.');
      }
      const imageBlob = await imageResponse.blob();
      formData.append('file', imageBlob, file.name);
    } else {
      formData.append('file', file as any);
    }

    return apiRequest<AuthUser>(
      '/auth/me/photo',
      {
        method: 'POST',
        body: formData,
      },
      token,
    );
  };

  return upload();
};

export const updateMyProfile = (
  token: string,
  data: Partial<AuthUser> & { password?: string; currentPassword?: string },
) =>
  apiRequest<AuthUser>(
    '/auth/me',
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token,
  );
