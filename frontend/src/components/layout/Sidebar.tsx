import { Link, useLocation } from 'react-router-dom';
import { TaskPermission, UserRole } from '../../types/auth.types';
import { getStoredUser, hasTaskPermission } from '../../utils/auth';

interface NavigationItem {
  name: string;
  path: string;
  icon: string;
  permission?: TaskPermission;
  allowedRoles?: UserRole[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: 'DB' },
  {
    name: 'Companies',
    path: '/companies',
    icon: 'CO',
    permission: 'COMPANY_MANAGEMENT',
    allowedRoles: ['SUPER_ADMIN', 'INTERNAL_REP'],
  },
  {
    name: 'Branches',
    path: '/branches',
    icon: 'BR',
    permission: 'COMPANY_MANAGEMENT',
    allowedRoles: ['SUPER_ADMIN', 'INTERNAL_REP'],
  },
  {
    name: 'Users',
    path: '/users',
    icon: 'US',
    permission: 'USER_MANAGEMENT',
    allowedRoles: ['SUPER_ADMIN'],
  },
  { name: 'Products', path: '/products', icon: 'PR', permission: 'DESIGN_ENTRIES' },
  { name: 'Orders', path: '/orders', icon: 'OR', permission: 'ORDER_ENTRIES' },
  {
    name: 'Pricing',
    path: '/pricing',
    icon: 'PC',
    permission: 'PRICING_CONFIGURATION',
    allowedRoles: ['SUPER_ADMIN'],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const user = getStoredUser();

  const visibleNavigation = navigation.filter((item) => {
    if (!item.permission || !user) {
      return true;
    }

    if (item.allowedRoles && !item.allowedRoles.includes(user.role)) {
      return false;
    }

    return hasTaskPermission(user, item.permission);
  });

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Jewelry Platform</h1>
      </div>
      <nav className="p-4 space-y-1">
        {visibleNavigation.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-xs font-semibold w-6">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
