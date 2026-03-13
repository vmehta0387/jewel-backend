import { apiRequest } from './client';
import type { MasterOption } from '../types';

export const fetchMasters = (
  token: string,
  type: string,
  status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE',
) => {
  const params = new URLSearchParams({ type, status });
  return apiRequest<{ data: MasterOption[] }>(`/products/masters?${params.toString()}`, { method: 'GET' }, token);
};
