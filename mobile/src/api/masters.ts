import { apiRequest } from './client';
import type { GroupedMastersResponse, MasterOption } from '../types';

export const fetchMasters = (
  token: string,
  type: string,
  status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE',
) => {
  const params = new URLSearchParams({ type, status });
  return apiRequest<{ data: MasterOption[] }>(`/products/masters?${params.toString()}`, { method: 'GET' }, token);
};

export const fetchAllGroupedMasters = (
  token: string,
  status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE',
) => {
  const params = new URLSearchParams({ status });
  return apiRequest<GroupedMastersResponse>(`/products/masters?${params.toString()}`, { method: 'GET' }, token);
};
