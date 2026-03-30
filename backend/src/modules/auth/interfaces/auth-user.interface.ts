import { UserRole } from '../../../common/enums/user-role.enum';
import { TaskPermission } from '../../../common/enums/task-permission.enum';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
  photoUrl: string | null;
  taskPermissions: TaskPermission[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
  taskPermissions: TaskPermission[];
}
