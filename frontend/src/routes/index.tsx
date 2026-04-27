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
import ProtectedRoute from '../components/auth/ProtectedRoute';
import UsersPage from '../pages/users/UsersPage';
import AddUser from '../pages/users/AddUser';
import EditUser from '../pages/users/EditUser';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'INTERNAL_REP']} />,
            children: [
              { path: '/companies', element: <CompaniesPage /> },
              { path: '/branches', element: <BranchesPage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']} />,
            children: [
              { path: '/companies/add', element: <AddCompany /> },
              { path: '/companies/edit/:id', element: <EditCompany /> },
              { path: '/branches/add', element: <AddBranch /> },
              { path: '/branches/edit/:id', element: <EditBranch /> },
              { path: '/users', element: <UsersPage /> },
              { path: '/users/add', element: <AddUser /> },
              { path: '/users/edit/:id', element: <EditUser /> },
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
        ],
      },
    ],
  },
]);
