export type OrderRole = 'SUPER_ADMIN' | 'INTERNAL_REP' | 'BRANCH_MANAGER' | 'COMPANY_ADMIN' | 'SALES_REP' | string | undefined | null;

export const normalizeOrderStatus = (status?: string | null): string => {
  return String(status || '').trim().toUpperCase();
};

export const isPowerOrderRole = (role: OrderRole): boolean => role === 'SUPER_ADMIN' || role === 'INTERNAL_REP';
export const isSuperAdminOrderRole = (role: OrderRole): boolean => role === 'SUPER_ADMIN';

export const isOrderApproverRole = (role: OrderRole): boolean =>
  role === 'BRANCH_MANAGER' || role === 'COMPANY_ADMIN' || isPowerOrderRole(role);

export const canEditOrderByStatus = (status: string | null | undefined, role: OrderRole): boolean => {
  const current = normalizeOrderStatus(status);
  if (current === 'CANCELLED') return false;
  if (current === 'COMPLETED') return isSuperAdminOrderRole(role);
  if (['APPROVED', 'IN_PRODUCTION', 'COMPLETED'].includes(current)) {
    return isPowerOrderRole(role);
  }
  return true;
};

export const canApproveOrderByStatus = (status: string | null | undefined, role: OrderRole): boolean =>
  normalizeOrderStatus(status) === 'PENDING_APPROVAL' && isOrderApproverRole(role);

export const canRejectOrderByStatus = (status: string | null | undefined, role: OrderRole): boolean =>
  normalizeOrderStatus(status) === 'PENDING_APPROVAL' && isOrderApproverRole(role);

export const getOrderSubmitStatus = (
  requestedStatus: 'QUOTE' | 'PENDING_APPROVAL',
  role: OrderRole,
): 'QUOTE' | 'PENDING_APPROVAL' | 'APPROVED' => {
  if (requestedStatus === 'QUOTE') return 'QUOTE';
  return isOrderApproverRole(role) ? 'APPROVED' : 'PENDING_APPROVAL';
};
