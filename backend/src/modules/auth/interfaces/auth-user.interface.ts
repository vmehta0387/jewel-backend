import { UserRole } from '../../../common/enums/user-role.enum';
import { TaskPermission } from '../../../common/enums/task-permission.enum';
import { PermissionDataScope } from '../../permissions/entities/user-permission-action.entity';

export interface AuthActionPermission {
  actionKey: string;
  dataScope: PermissionDataScope;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: number | null;
  branchId: number | null;
  photoUrl: string | null;
  phone?: string | null;
  taskPermissions: TaskPermission[];
  detailedPermissions?: AuthActionPermission[];
  companyName?: string | null;
  branchName?: string | null;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  companyId: number | null;
  branchId: number | null;
  taskPermissions: TaskPermission[];
}
