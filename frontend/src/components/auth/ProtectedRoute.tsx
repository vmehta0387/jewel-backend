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

  if (allowedRoles && !hasAllowedRole(user, allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredTaskPermissions && !hasAllTaskPermissions(user, requiredTaskPermissions)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
