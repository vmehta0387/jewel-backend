import { AuthUser, TaskPermission, UserRole } from '../types/auth.types';

const TOKEN_KEY = 'token';
const USER_KEY = 'auth_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.id || !parsed.email || !parsed.firstName || !parsed.lastName || !parsed.role) {
      return null;
    }

    return {
      id: parsed.id,
      email: parsed.email,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      role: parsed.role,
      companyId: parsed.companyId ?? null,
      branchId: parsed.branchId ?? null,
      photoUrl: parsed.photoUrl ?? null,
      taskPermissions: parsed.taskPermissions ?? [],
    };
  } catch {
    return null;
  }
}

export function saveAuthSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasAllowedRole(user: AuthUser, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(user.role);
}

export function hasTaskPermission(user: AuthUser, permission: TaskPermission): boolean {
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  return user.taskPermissions.includes(permission);
}

export function hasAllTaskPermissions(user: AuthUser, permissions: TaskPermission[]): boolean {
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  return permissions.every((permission) => user.taskPermissions.includes(permission));
}
