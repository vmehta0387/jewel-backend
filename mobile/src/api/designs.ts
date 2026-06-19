import { apiRequest } from './client';
import type { Design, DesignListResponse } from '../types';

export const fetchDesigns = (token: string, page = 1, limit = 25) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status: 'ACTIVE',
  });
  return apiRequest<DesignListResponse>(`/products?${params.toString()}`, { method: 'GET' }, token);
};

export const fetchDesign = (token: string, id: string) =>
  apiRequest<Design>(`/products/${id}`, { method: 'GET' }, token);

export const fetchAllDesigns = async (token: string, limit = 500) => {
  let page = 1;
  let totalPages = 1;
  const rows: Design[] = [];

  do {
    const response = await fetchDesigns(token, page, limit);
    rows.push(...(response.data || []));
    totalPages = response.totalPages || 1;
    page += 1;
  } while (page <= totalPages);

  return rows;
};
