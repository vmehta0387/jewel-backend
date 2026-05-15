import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { TaskPermission, UserRole } from '../../types/auth.types';
import { clearAuthSession, getStoredUser, getToken, hasAllTaskPermissions, hasAllowedRole } from '../../utils/auth';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requiredTaskPermissions?: TaskPermission[];
}

export default function ProtectedRoute({ allowedRoles, requiredTaskPermissions }: ProtectedRouteProps) {
  const location = useLocation();
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    clearAuthSession();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const fallbackPath =
    user.role === 'COMPANY_ADMIN' || user.role === 'BRANCH_MANAGER'
      ? '/orders'
      : '/dashboard';

  if (allowedRoles && !hasAllowedRole(user, allowedRoles)) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (requiredTaskPermissions && !hasAllTaskPermissions(user, requiredTaskPermissions)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}
