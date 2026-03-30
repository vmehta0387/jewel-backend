export type UserRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'BRANCH_MANAGER'
  | 'SALES_REP'
  | 'INTERNAL_REP';

export type TaskPermission =
  | 'COMPANY_MANAGEMENT'
  | 'BRANCH_MANAGEMENT'
  | 'USER_MANAGEMENT'
  | 'DESIGN_ENTRIES'
  | 'ORDER_ENTRIES'
  | 'ORDER_APPROVALS'
  | 'PRICING_CONFIGURATION'
  | 'VIEW_REPORTS';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
  photoUrl?: string | null;
  taskPermissions: TaskPermission[];
}
