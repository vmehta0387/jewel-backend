import { apiRequest } from './client';
import type { AuthUser } from '../types';

export type LoginResponse = { accessToken: string; user: AuthUser };

export const login = (email: string, password: string) =>
  apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const me = (token: string) =>
  apiRequest<AuthUser>('/auth/me', { method: 'GET' }, token);
