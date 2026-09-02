import { UserRole } from '../../common/enums/user-role.enum';
import { PermissionDataScope } from './entities/user-permission-action.entity';

export const RESTORED_SPIFF_ACTION_KEYS = [
  'spiff.view',
  'spiff.claim.create',
  'spiff.claim.review',
] as const;

export const getRestoredSpiffPermissionsForRole = (
  role: UserRole,
): Array<{ actionKey: string; dataScope: PermissionDataScope }> => {
  const dataScope =
    role === UserRole.BRANCH_MANAGER
      ? PermissionDataScope.BRANCH
      : role === UserRole.SALES_REP
        ? PermissionDataScope.OWN
        : null;

  return dataScope
    ? RESTORED_SPIFF_ACTION_KEYS.map((actionKey) => ({ actionKey, dataScope }))
    : [];
};
