import { apiRequest } from './client';
import { API_BASE_URL } from '../config';
import type { OrdersResponse, Order } from '../types';

export type OrderPeriod = 'TODAY' | 'WEEKLY' | 'MONTHLY' | 'ANNUALLY';
export type OrderStatusGroup = 'FULFILLED' | 'SHIPPED_OR_COMPLETED';
export type OrderPeriodSummary = Record<'today' | 'weekly' | 'monthly' | 'annually', { count: number; totalAmount: number }>;
export type FetchOrdersOptions = {
  period?: OrderPeriod;
  statusGroup?: OrderStatusGroup;
  search?: string;
  orderStatus?: string;
  salesRepId?: string;
  includeStatusCounts?: boolean;
};

export const fetchOrders = (
  token: string,
  page = 1,
  limit = 25,
  status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE',
  options: FetchOrdersOptions = {},
) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });
  if (options.period) params.set('period', options.period);
  if (options.statusGroup) params.set('statusGroup', options.statusGroup);
  if (options.search?.trim()) params.set('search', options.search.trim());
  if (options.orderStatus) params.set('orderStatus', options.orderStatus);
  if (options.salesRepId) params.set('salesRepId', options.salesRepId);
  if (options.includeStatusCounts) params.set('includeStatusCounts', 'true');
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
    branchRevenueTotal?: number;
    branchSalesRepCount?: number;
    pendingApprovalOrders?: number;
    pipeline?: {
      pending: number;
      approved: number;
      inProduction: number;
      shipped: number;
      completed: number;
      cancelled: number;
    };
  }>('/orders/summary', { method: 'GET' }, token);

export const fetchOrderPeriodSummary = (token: string) =>
  apiRequest<OrderPeriodSummary>('/orders/period-summary', { method: 'GET' }, token);

export const fetchOrderTrends = (token: string) =>
  apiRequest<{
    range: string[];
    orders: number[];
    sales: number[];
  }>('/orders/trends', { method: 'GET' }, token);

export const fetchOrder = (token: string, id: string) =>
  apiRequest<Order>(`/orders/${id}`, { method: 'GET' }, token);

export const getOrderPdfUrl = (id: string) => `${API_BASE_URL}/orders/${encodeURIComponent(id)}/pdf`;

export const fetchPurchaseOrderUsage = (
  token: string,
  params: {
    companyId: string;
    branchId: string;
    purchaseOrderNumber: string;
    excludeOrderId?: string | null;
  },
) => {
  const query = new URLSearchParams({
    companyId: params.companyId,
    branchId: params.branchId,
    purchaseOrderNumber: params.purchaseOrderNumber,
  });
  if (params.excludeOrderId) query.set('excludeOrderId', params.excludeOrderId);

  return apiRequest<{
    count: number;
    orders: Array<{
      id: string;
      orderNumber: string;
      status: string;
      designNo?: string | null;
      customerName?: string | null;
      createdAt?: string;
    }>;
  }>(`/orders/po-usage?${query.toString()}`, { method: 'GET' }, token);
};

export const fetchPricePreview = (
  token: string,
  designId: string,
  companyId: string,
  branchId: string,
) =>
  apiRequest<{ baseCost: number; companyMultiplier: number; companyPrice: number; branchMultiplier: number; finalPrice: number }>(
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
  purchaseOrderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
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

export const updateOrderActiveStatus = (token: string, id: string, isActive: boolean) =>
  apiRequest<Order>(`/orders/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  }, token);
