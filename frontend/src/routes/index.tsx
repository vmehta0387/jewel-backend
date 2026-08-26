import { Navigate, createBrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import PrivacyPolicyPage from '../pages/legal/PrivacyPolicyPage';
import DashboardLayout from '../components/layout/DashboardLayout';
import DashboardPage from '../pages/dashboard/DashboardPage';
import CompaniesPage from '../pages/companies/CompaniesPage';
import AddCompany from '../pages/companies/AddCompany';
import EditCompany from '../pages/companies/EditCompany';
import BranchesPage from '../pages/branches/BranchesPage';
import AddBranch from '../pages/branches/AddBranch';
import EditBranch from '../pages/branches/EditBranch';
import ProductsPage from '../pages/products/ProductsPage';
import DesignMastersPage from '../pages/masters/DesignMastersPage';
import OrdersPage from '../pages/orders/OrdersPage';
import SpiffPage from '../pages/spiff/SpiffPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import ActivityEventsPage from '../pages/activity/ActivityEventsPage';
import RoleDefaultPermissionsPage from '../pages/permissions/RoleDefaultPermissionsPage';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import UsersPage from '../pages/users/UsersPage';
import AddUser from '../pages/users/AddUser';
import EditUser from '../pages/users/EditUser';
import { getStoredUser, getToken } from '../utils/auth';

function HomeRedirect() {
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'COMPANY_ADMIN') {
    return <Navigate to="/orders" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeRedirect />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/privacy-policy',
    element: <PrivacyPolicyPage />,
  },
  {
    element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INTERNAL_REP', 'COMPANY_ADMIN']} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            children: [{ path: '/dashboard', element: <DashboardPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INTERNAL_REP']} requiredActionPermissions={['company.view']} />,
            children: [
              { path: '/companies', element: <CompaniesPage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INTERNAL_REP', 'COMPANY_ADMIN']} requiredTaskPermissions={['BRANCH_MANAGEMENT']} requiredActionPermissions={['branch.view']} />,
            children: [
              { path: '/branches', element: <BranchesPage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']} requiredTaskPermissions={['USER_MANAGEMENT']} requiredActionPermissions={['user.view']} />,
            children: [
              { path: '/users', element: <UsersPage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']} requiredActionPermissions={['company.create']} />,
            children: [
              { path: '/companies/add', element: <AddCompany /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']} requiredActionPermissions={['company.edit']} />,
            children: [
              { path: '/companies/edit/:id', element: <EditCompany /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']} requiredTaskPermissions={['BRANCH_MANAGEMENT']} requiredActionPermissions={['branch.create']} />,
            children: [{ path: '/branches/add', element: <AddBranch /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']} requiredTaskPermissions={['BRANCH_MANAGEMENT']} requiredActionPermissions={['branch.edit']} />,
            children: [{ path: '/branches/edit/:id', element: <EditBranch /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']} requiredTaskPermissions={['USER_MANAGEMENT']} requiredActionPermissions={['user.create']} />,
            children: [{ path: '/users/add', element: <AddUser /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']} requiredTaskPermissions={['USER_MANAGEMENT']} requiredActionPermissions={['user.edit']} />,
            children: [{ path: '/users/edit/:id', element: <EditUser /> }],
          },
          {
            element: <ProtectedRoute requiredTaskPermissions={['DESIGN_ENTRIES']} />,
            children: [
              { path: '/products', element: <ProductsPage /> },
            ],
          },
          {
            element: <ProtectedRoute requiredTaskPermissions={['DESIGN_ENTRIES']} requiredActionPermissions={['master.view']} />,
            children: [{ path: '/masters/design', element: <DesignMastersPage /> }],
          },
          {
            children: [{ path: '/orders', element: <OrdersPage /> }],
          },
          {
            element: <ProtectedRoute requiredTaskPermissions={['ORDER_ENTRIES']} requiredActionPermissions={['spiff.view']} />,
            children: [{ path: '/spiff', element: <SpiffPage /> }],
          },
          {
            children: [{ path: '/notifications', element: <NotificationsPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']} />,
            children: [{ path: '/permissions/defaults', element: <RoleDefaultPermissionsPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']} />,
            children: [{ path: '/activity-events', element: <ActivityEventsPage /> }],
          },
        ],
      },
    ],
  },
]);
