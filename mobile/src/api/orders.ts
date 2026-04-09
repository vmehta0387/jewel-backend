import { apiRequest } from './client';
import type { OrdersResponse, Order } from '../types';

export const fetchOrders = (
  token: string,
  page = 1,
  limit = 25,
  status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE',
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });
  return apiRequest<OrdersResponse>(`/orders?${params.toString()}`, { method: 'GET' }, token);
};

export const fetchOrderSummary = (token: string) =>
  apiRequest<{
    activeOrders: number;
    salesToday: number;
    todayTrend: number;
    salesThisMonth: number;
    monthlyTrend: number;
    ordersToday: number;
    ordersThisMonth: number;
  }>('/orders/summary', { method: 'GET' }, token);

export const fetchOrderTrends = (token: string) =>
  apiRequest<{
    range: string[];
    orders: number[];
    sales: number[];
  }>('/orders/trends', { method: 'GET' }, token);

export const fetchOrder = (token: string, id: string) =>
  apiRequest<Order>(`/orders/${id}`, { method: 'GET' }, token);

export const fetchPricePreview = (
  token: string,
  designId: string,
  companyId: string,
  branchId: string,
) =>
  apiRequest<{ baseCost: number; companyMultiplier: number; branchMultiplier: number; finalPrice: number }>(
    `/orders/price-preview?designId=${encodeURIComponent(designId)}&companyId=${encodeURIComponent(
      companyId,
    )}&branchId=${encodeURIComponent(branchId)}`,
    { method: 'GET' },
    token,
  );

export type CreateOrderPayload = {
  companyId: string;
  branchId: string;
  designId: string;
  quantity: number;
  price: number;
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
    method: 'PUT',
    body: JSON.stringify(payload),
  }, token);
