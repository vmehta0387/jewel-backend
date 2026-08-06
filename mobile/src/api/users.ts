import { apiRequest } from './client';
import type { AuthUser, UserRole } from '../types';

export type LookupUser = AuthUser & {
  isActive?: boolean;
  company?: {
    id: string;
    companyName: string;
    companyCode?: string | null;
  } | null;
  branch?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
};

export const fetchUserLookup = (
  token: string,
  params: { role?: UserRole; status?: 'ACTIVE' | 'INACTIVE' | 'ALL'; companyId?: string; branchId?: string } = {},
) => {
  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.status) query.set('status', params.status);
  if (params.companyId) query.set('companyId', params.companyId);
  if (params.branchId) query.set('branchId', params.branchId);

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest<LookupUser[]>(`/users/lookup${suffix}`, { method: 'GET' }, token);
};
