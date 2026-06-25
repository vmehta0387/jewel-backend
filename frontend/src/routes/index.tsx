import { Navigate, createBrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
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

  if (user.role === 'COMPANY_ADMIN' || user.role === 'BRANCH_MANAGER') {
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
    element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INTERNAL_REP', 'COMPANY_ADMIN', 'BRANCH_MANAGER']} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INTERNAL_REP']} />,
            children: [{ path: '/dashboard', element: <DashboardPage /> }],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INTERNAL_REP']} />,
            children: [
              { path: '/companies', element: <CompaniesPage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INTERNAL_REP', 'COMPANY_ADMIN']} requiredTaskPermissions={['BRANCH_MANAGEMENT']} />,
            children: [
              { path: '/branches', element: <BranchesPage /> },
              { path: '/branches/add', element: <AddBranch /> },
              { path: '/branches/edit/:id', element: <EditBranch /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'COMPANY_ADMIN']} requiredTaskPermissions={['USER_MANAGEMENT']} />,
            children: [
              { path: '/users', element: <UsersPage /> },
              { path: '/users/add', element: <AddUser /> },
              { path: '/users/edit/:id', element: <EditUser /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']} />,
            children: [
              { path: '/companies/add', element: <AddCompany /> },
              { path: '/companies/edit/:id', element: <EditCompany /> },
            ],
          },
          {
            element: <ProtectedRoute requiredTaskPermissions={['DESIGN_ENTRIES']} />,
            children: [
              { path: '/products', element: <ProductsPage /> },
              { path: '/masters/design', element: <DesignMastersPage /> },
            ],
          },
          {
            element: <ProtectedRoute requiredTaskPermissions={['ORDER_ENTRIES']} />,
            children: [{ path: '/orders', element: <OrdersPage /> }],
          },
          {
            element: <ProtectedRoute requiredTaskPermissions={['ORDER_ENTRIES']} />,
            children: [{ path: '/spiff', element: <SpiffPage /> }],
          },
          {
            children: [{ path: '/notifications', element: <NotificationsPage /> }],
          },
        ],
      },
    ],
  },
]);
