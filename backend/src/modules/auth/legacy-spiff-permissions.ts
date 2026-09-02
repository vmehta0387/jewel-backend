import { TaskPermission } from '../../common/enums/task-permission.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionDataScope } from '../permissions/entities/user-permission-action.entity';
import { getRestoredSpiffPermissionsForRole } from '../permissions/spiff-role-permissions';

type LegacyPermissionUser = {
  role: UserRole;
  taskPermissions?: TaskPermission[] | null;
};

export const getLegacySpiffPermissions = (
  user: LegacyPermissionUser,
): Array<{ actionKey: string; dataScope: PermissionDataScope }> => {
  if (!(user.taskPermissions || []).includes(TaskPermission.ORDER_ENTRIES)) {
    return [];
  }

  const dataScope =
    user.role === UserRole.COMPANY_ADMIN
      ? PermissionDataScope.COMPANY
      : user.role === UserRole.BRANCH_MANAGER
        ? PermissionDataScope.BRANCH
        : PermissionDataScope.OWN;
  const actionKeys = ['spiff.view', 'mobile.spiff.view', 'mobile.spiff.leaderboard.view'];

  if (user.role === UserRole.COMPANY_ADMIN) {
    actionKeys.push('spiff.claim.review', 'mobile.spiff.claim.review');
  }

  const restoredPermissions = getRestoredSpiffPermissionsForRole(user.role);
  const permissions = [
    ...actionKeys.map((actionKey) => ({ actionKey, dataScope })),
    ...restoredPermissions,
  ];
  return Array.from(new Map(permissions.map((permission) => [permission.actionKey, permission])).values());
};
