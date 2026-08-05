export type OrderRole = 'SUPER_ADMIN' | 'INTERNAL_REP' | 'BRANCH_MANAGER' | 'COMPANY_ADMIN' | 'SALES_REP' | string | undefined | null;

export const orderStatusOptions = [
  'QUOTE',
  'PENDING_APPROVAL',
  'APPROVED',
  'IN_PRODUCTION',
  'COMPLETED',
  'CANCELLED',
] as const;

export type OrderStatusValue = typeof orderStatusOptions[number];

export const normalizeOrderStatus = (status?: string | null): string => {
  return String(status || '').trim().toUpperCase();
};

export const isPowerOrderRole = (role: OrderRole): boolean => role === 'SUPER_ADMIN' || role === 'INTERNAL_REP';
export const isSuperAdminOrderRole = (role: OrderRole): boolean => role === 'SUPER_ADMIN';

export const isOrderApproverRole = (role: OrderRole): boolean =>
  role === 'BRANCH_MANAGER' || role === 'COMPANY_ADMIN' || isPowerOrderRole(role);

export const canViewOrderHistory = (role: OrderRole): boolean => isPowerOrderRole(role);

export const canEditOrderByStatus = (status: string | null | undefined, role: OrderRole): boolean => {
  const current = normalizeOrderStatus(status);
  if (current === 'CANCELLED') return false;
  if (current === 'COMPLETED') return isSuperAdminOrderRole(role);
  if (['APPROVED', 'IN_PRODUCTION', 'COMPLETED'].includes(current)) {
    return isPowerOrderRole(role);
  }
  return true;
};

export const canCancelOrderByStatus = (
  status: string | null | undefined,
  role: OrderRole,
  orderSalesRepId?: string | null,
  userId?: string | null,
): boolean => {
  const current = normalizeOrderStatus(status);
  if (current === 'CANCELLED') return false;
  if (isPowerOrderRole(role) || isOrderApproverRole(role)) return true;
  return role === 'SALES_REP' && orderSalesRepId === userId && ['QUOTE', 'PENDING_APPROVAL'].includes(current);
};

export const canChangeOrderStatus = (
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined,
  role: OrderRole,
  orderSalesRepId?: string | null,
  userId?: string | null,
): boolean => {
  const from = normalizeOrderStatus(fromStatus);
  const to = normalizeOrderStatus(toStatus);
  if (!to || from === to) return false;
  if (from === 'CANCELLED') return false;
  if (from === 'COMPLETED' && !isSuperAdminOrderRole(role)) return false;
  if (['APPROVED', 'IN_PRODUCTION', 'COMPLETED'].includes(from) && !isPowerOrderRole(role)) return false;
  if (to === 'APPROVED' && !isOrderApproverRole(role)) return false;
  if (['IN_PRODUCTION', 'COMPLETED'].includes(to) && !isPowerOrderRole(role)) return false;
  if (to === 'CANCELLED' && !canCancelOrderByStatus(from, role, orderSalesRepId, userId)) return false;
  return true;
};

export const getAllowedOrderStatuses = (
  fromStatus: string | null | undefined,
  role: OrderRole,
  orderSalesRepId?: string | null,
  userId?: string | null,
): string[] => {
  const current = normalizeOrderStatus(fromStatus);
  return orderStatusOptions.filter(
    (status) => status === current || canChangeOrderStatus(current, status, role, orderSalesRepId, userId),
  );
};

export const canOpenOrderStatusChange = (
  fromStatus: string | null | undefined,
  role: OrderRole,
  orderSalesRepId?: string | null,
  userId?: string | null,
): boolean => getAllowedOrderStatuses(fromStatus, role, orderSalesRepId, userId).length > 1;
