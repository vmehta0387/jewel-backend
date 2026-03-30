import { TaskPermission, UserRole } from './auth.types';

export interface UserCompanySummary {
  id: string;
  companyName: string;
  companyCode: string;
}

export interface UserBranchSummary {
  id: string;
  name: string;
  code: string;
}

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
  phone: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  taskPermissions: TaskPermission[];
  company: UserCompanySummary | null;
  managedCompanies: UserCompanySummary[];
  branch: UserBranchSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoleOption {
  value: UserRole;
  label: string;
}

export interface TaskPermissionOption {
  value: TaskPermission;
  label: string;
  description: string;
}

export const USER_ROLE_OPTIONS: RoleOption[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'COMPANY_ADMIN', label: 'Company Admin' },
  { value: 'BRANCH_MANAGER', label: 'Branch Manager' },
  { value: 'SALES_REP', label: 'Sales Rep' },
  { value: 'INTERNAL_REP', label: 'Internal Rep' },
];

export const TASK_PERMISSION_OPTIONS: TaskPermissionOption[] = [
  {
    value: 'COMPANY_MANAGEMENT',
    label: 'Company Management',
    description: 'Create and update company profiles and settings.',
  },
  {
    value: 'BRANCH_MANAGEMENT',
    label: 'Branch Management',
    description: 'Create and update branch profiles and pricing multipliers.',
  },
  {
    value: 'USER_MANAGEMENT',
    label: 'User Management',
    description: 'Create, edit, and manage user access.',
  },
  {
    value: 'DESIGN_ENTRIES',
    label: 'Design Entries',
    description: 'Create and maintain design/ring style records.',
  },
  {
    value: 'ORDER_ENTRIES',
    label: 'Order Entries',
    description: 'Create and submit quotes/orders.',
  },
  {
    value: 'ORDER_APPROVALS',
    label: 'Order Approvals',
    description: 'Approve or reject submitted orders.',
  },
  {
    value: 'PRICING_CONFIGURATION',
    label: 'Pricing Configuration',
    description: 'Manage price multipliers and pricing rules.',
  },
  {
    value: 'VIEW_REPORTS',
    label: 'View Reports',
    description: 'View dashboards, KPIs, and reporting screens.',
  },
];

export const TASK_PERMISSION_LABELS: Record<TaskPermission, string> = {
  COMPANY_MANAGEMENT: 'Company Management',
  BRANCH_MANAGEMENT: 'Branch Management',
  USER_MANAGEMENT: 'User Management',
  DESIGN_ENTRIES: 'Design Entries',
  ORDER_ENTRIES: 'Order Entries',
  ORDER_APPROVALS: 'Order Approvals',
  PRICING_CONFIGURATION: 'Pricing Configuration',
  VIEW_REPORTS: 'View Reports',
};

export const DEFAULT_TASK_PERMISSIONS_BY_ROLE: Record<UserRole, TaskPermission[]> = {
  SUPER_ADMIN: TASK_PERMISSION_OPTIONS.map((item) => item.value),
  COMPANY_ADMIN: [
    'BRANCH_MANAGEMENT',
    'USER_MANAGEMENT',
    'DESIGN_ENTRIES',
    'ORDER_ENTRIES',
    'ORDER_APPROVALS',
    'PRICING_CONFIGURATION',
    'VIEW_REPORTS',
  ],
  BRANCH_MANAGER: ['DESIGN_ENTRIES', 'ORDER_ENTRIES', 'ORDER_APPROVALS', 'VIEW_REPORTS'],
  SALES_REP: ['DESIGN_ENTRIES', 'ORDER_ENTRIES', 'VIEW_REPORTS'],
  INTERNAL_REP: ['COMPANY_MANAGEMENT', 'VIEW_REPORTS'],
};
