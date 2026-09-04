import type { AuthUser } from '../types';

const LEGACY_PERMISSION_BY_ACTION_PREFIX: Array<{ prefix: string; permissions: string[] }> = [
  { prefix: 'mobile.dashboard', permissions: ['VIEW_REPORTS'] },
  { prefix: 'mobile.notification', permissions: ['VIEW_REPORTS'] },
  { prefix: 'catalog.', permissions: ['DESIGN_ENTRIES'] },
  { prefix: 'mobile.design.', permissions: ['DESIGN_ENTRIES'] },
  { prefix: 'quote.', permissions: ['ORDER_ENTRIES'] },
  { prefix: 'mobile.order.price_preview', permissions: ['ORDER_ENTRIES'] },
  { prefix: 'mobile.order.status_update', permissions: ['ORDER_APPROVALS'] },
  { prefix: 'mobile.order.approve', permissions: ['ORDER_APPROVALS'] },
  { prefix: 'mobile.order.reject', permissions: ['ORDER_APPROVALS'] },
  { prefix: 'mobile.order.', permissions: ['ORDER_ENTRIES'] },
  { prefix: 'mobile.pricing.', permissions: ['PRICING_CONFIGURATION'] },
  { prefix: 'branch.', permissions: ['BRANCH_MANAGEMENT'] },
  { prefix: 'team.employee.manage', permissions: ['USER_MANAGEMENT'] },
  { prefix: 'mobile.spiff.claim.review', permissions: ['ORDER_APPROVALS'] },
  { prefix: 'mobile.spiff.', permissions: ['ORDER_ENTRIES'] },
  { prefix: 'spiff.claim.review', permissions: ['ORDER_APPROVALS'] },
  { prefix: 'spiff.', permissions: ['ORDER_ENTRIES'] },
  { prefix: 'mobile.ai.orders.lookup', permissions: ['ORDER_ENTRIES'] },
  { prefix: 'mobile.ai.pricing.view', permissions: ['PRICING_CONFIGURATION'] },
  { prefix: 'mobile.ai.', permissions: ['DESIGN_ENTRIES'] },
  { prefix: 'order.require_approval', permissions: ['ORDER_ENTRIES'] },
];

const hasLegacyPermissionForAction = (user: AuthUser, actionKey: string) => {
  const taskPermissions = new Set(user.taskPermissions || []);
  const rule = LEGACY_PERMISSION_BY_ACTION_PREFIX.find((item) => actionKey.startsWith(item.prefix));
  return Boolean(rule && rule.permissions.some((permission) => taskPermissions.has(permission)));
};

export const hasActionPermission = (user: AuthUser | null | undefined, actionKey: string) => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.detailedPermissions && user.detailedPermissions.length > 0) {
    return user.detailedPermissions.some((permission) => permission.actionKey === actionKey);
  }
  return hasLegacyPermissionForAction(user, actionKey);
};

export const hasAnyActionPermission = (user: AuthUser | null | undefined, actionKeys: string[]) => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return actionKeys.some((actionKey) => hasActionPermission(user, actionKey));
};

export const salesRepRequiresApproval = (user: AuthUser | null | undefined): boolean => {
  if (!user || user.role !== 'SALES_REP') return false;
  if (!user.detailedPermissions || user.detailedPermissions.length === 0) {
    return true;
  }
  return user.detailedPermissions.some((permission) => permission.actionKey === 'order.require_approval');
};

