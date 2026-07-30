import { TaskPermission } from '../../common/enums/task-permission.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionDataScope } from '../permissions/entities/user-permission-action.entity';

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

  if (user.role === UserRole.SALES_REP) {
    actionKeys.push('spiff.claim.create', 'mobile.spiff.claim.create');
  }

  if (user.role === UserRole.BRANCH_MANAGER || user.role === UserRole.COMPANY_ADMIN) {
    actionKeys.push('spiff.claim.review', 'mobile.spiff.claim.review');
  }

  return actionKeys.map((actionKey) => ({ actionKey, dataScope }));
};
