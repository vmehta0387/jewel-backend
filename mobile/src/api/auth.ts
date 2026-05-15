import { apiRequest } from './client';
import type { AuthUser } from '../types';

export type LoginResponse = { accessToken: string; user: AuthUser };

export const login = (email: string, password: string) =>
  apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, clientPlatform: 'MOBILE_APP' }),
  });

export const me = (token: string) =>
  apiRequest<AuthUser>('/auth/me', { method: 'GET' }, token);

export const uploadMyPhoto = (
  token: string,
  file: { uri: string; name: string; type: string },
) => {
  const formData = new FormData();
  formData.append('file', file as any);
  return apiRequest<AuthUser>(
    '/auth/me/photo',
    {
      method: 'POST',
      body: formData,
    },
    token,
  );
};
