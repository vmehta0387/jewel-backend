import { apiRequest } from './client';
import type { OrdersResponse, Order } from '../types';

export const fetchOrders = (token: string, page = 1, limit = 25) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status: 'ACTIVE',
  });
  return apiRequest<OrdersResponse>(`/orders?${params.toString()}`, { method: 'GET' }, token);
};

export const fetchOrder = (token: string, id: string) =>
  apiRequest<Order>(`/orders/${id}`, { method: 'GET' }, token);

export type CreateOrderPayload = {
  companyId: string;
  branchId: string;
  designId: string;
  quantity: number;
  deliveryDate?: string;
  shortDescription?: string;
  notes?: string;
  status?: string;
};

export const createOrder = (token: string, payload: CreateOrderPayload) =>
  apiRequest<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token);

export const updateOrder = (token: string, id: string, payload: Partial<CreateOrderPayload>) =>
  apiRequest<Order>(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, token);
