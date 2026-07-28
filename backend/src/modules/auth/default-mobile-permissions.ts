import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionDataScope } from '../permissions/entities/user-permission-action.entity';

export type DefaultMobileActionPermission = {
  actionKey: string;
  dataScope: PermissionDataScope;
};

const salesRepPermissions: DefaultMobileActionPermission[] = [
  { actionKey: 'mobile.dashboard.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.totals.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.quick_actions.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.quick_actions.orders.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.quick_actions.spiff.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.quick_actions.catalog.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.trending.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.trending.price.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.trending.open_design', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.pipeline.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.performance.rep.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.notifications.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.dashboard.profile_photo.update', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.order.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.order.create', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.order.edit', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.order.price_preview', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.spiff.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.spiff.leaderboard.view', dataScope: PermissionDataScope.OWN },
  { actionKey: 'mobile.spiff.claim.create', dataScope: PermissionDataScope.OWN },
];

const branchManagerPermissions: DefaultMobileActionPermission[] = [
  ...salesRepPermissions.map((permission) => ({ ...permission, dataScope: PermissionDataScope.BRANCH })),
  { actionKey: 'branch.view', dataScope: PermissionDataScope.BRANCH },
  { actionKey: 'team.employee.manage', dataScope: PermissionDataScope.BRANCH },
  { actionKey: 'mobile.dashboard.quick_actions.branches.view', dataScope: PermissionDataScope.BRANCH },
  { actionKey: 'mobile.dashboard.quick_actions.team.view', dataScope: PermissionDataScope.BRANCH },
  { actionKey: 'mobile.dashboard.performance.branch.view', dataScope: PermissionDataScope.BRANCH },
  { actionKey: 'mobile.order.status_update', dataScope: PermissionDataScope.BRANCH },
  { actionKey: 'mobile.spiff.claim.review', dataScope: PermissionDataScope.BRANCH },
];

const companyAdminPermissions: DefaultMobileActionPermission[] = [
  ...branchManagerPermissions.map((permission) => ({ ...permission, dataScope: PermissionDataScope.COMPANY })),
  { actionKey: 'mobile.pricing.view', dataScope: PermissionDataScope.COMPANY },
  { actionKey: 'mobile.pricing.company.update', dataScope: PermissionDataScope.COMPANY },
  { actionKey: 'mobile.pricing.branch.update', dataScope: PermissionDataScope.COMPANY },
];

export const getDefaultMobileActionPermissions = (role: UserRole): DefaultMobileActionPermission[] => {
  if (role === UserRole.COMPANY_ADMIN) {
    return companyAdminPermissions;
  }
  if (role === UserRole.BRANCH_MANAGER) {
    return branchManagerPermissions;
  }
  if (role === UserRole.SALES_REP) {
    return salesRepPermissions;
  }
  return [];
};

export const getDefaultMobileActionPermissionKeys = (role: UserRole): string[] =>
  getDefaultMobileActionPermissions(role).map((permission) => permission.actionKey);
