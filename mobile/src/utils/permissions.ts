import type { AuthUser } from '../types';

export const hasActionPermission = (user: AuthUser | null | undefined, actionKey: string) => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return Boolean(user.detailedPermissions?.some((permission) => permission.actionKey === actionKey));
};

export const hasAnyActionPermission = (user: AuthUser | null | undefined, actionKeys: string[]) => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  const allowed = new Set((user.detailedPermissions || []).map((permission) => permission.actionKey));
  return actionKeys.some((actionKey) => allowed.has(actionKey));
};

export const salesRepRequiresApproval = (user: AuthUser | null | undefined): boolean => {
  if (!user || user.role !== 'SALES_REP') return false;
  if (!user.detailedPermissions || user.detailedPermissions.length === 0) {
    return true;
  }
  return user.detailedPermissions.some((permission) => permission.actionKey === 'order.require_approval');
};
