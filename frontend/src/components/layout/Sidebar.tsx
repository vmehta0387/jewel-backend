import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TaskPermission, UserRole } from '../../types/auth.types';
import { getStoredUser, hasTaskPermission } from '../../utils/auth';

type MenuIconName =
  | 'dashboard'
  | 'companies'
  | 'branches'
  | 'users'
  | 'designs'
  | 'masters'
  | 'orders'
  | 'pricing';

interface NavigationItem {
  name: string;
  path: string;
  icon: MenuIconName;
  permission?: TaskPermission;
  allowedRoles?: UserRole[];
}

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  {
    name: 'Companies',
    path: '/companies',
    icon: 'companies',
    permission: 'COMPANY_MANAGEMENT',
    allowedRoles: ['SUPER_ADMIN', 'INTERNAL_REP'],
  },
  {
    name: 'Branches',
    path: '/branches',
    icon: 'branches',
    permission: 'COMPANY_MANAGEMENT',
    allowedRoles: ['SUPER_ADMIN', 'INTERNAL_REP'],
  },
  {
    name: 'Users',
    path: '/users',
    icon: 'users',
    permission: 'USER_MANAGEMENT',
    allowedRoles: ['SUPER_ADMIN'],
  },
  { name: 'Designs', path: '/products', icon: 'designs', permission: 'DESIGN_ENTRIES' },
  { name: 'Masters', path: '/masters/design', icon: 'masters', permission: 'DESIGN_ENTRIES' },
  { name: 'Orders', path: '/orders', icon: 'orders', permission: 'ORDER_ENTRIES' },
  {
    name: 'Pricing',
    path: '/pricing',
    icon: 'pricing',
    permission: 'PRICING_CONFIGURATION',
    allowedRoles: ['SUPER_ADMIN'],
  },
];

function MenuIcon({ name, isActive }: { name: MenuIconName; isActive: boolean }) {
  const iconBase = {
    className: 'h-4 w-4',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  let iconBody: ReactNode = null;
  if (name === 'dashboard') {
    iconBody = (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    );
  } else if (name === 'companies') {
    iconBody = (
      <>
        <path d="M4.5 20.25h15" />
        <path d="M6 20.25V5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 .75.75v15" />
        <path d="M9 8.25h2.25M9 11.25h2.25M9 14.25h2.25M13.5 8.25h2.25M13.5 11.25h2.25M13.5 14.25h2.25" />
        <path d="M10.5 20.25v-3h3v3" />
      </>
    );
  } else if (name === 'branches') {
    iconBody = (
      <>
        <circle cx="6.75" cy="6.75" r="2.25" />
        <circle cx="17.25" cy="6.75" r="2.25" />
        <circle cx="17.25" cy="17.25" r="2.25" />
        <path d="M9 6.75h6M6.75 9v6.75a1.5 1.5 0 0 0 1.5 1.5H15" />
      </>
    );
  } else if (name === 'users') {
    iconBody = (
      <>
        <circle cx="12" cy="8.25" r="3" />
        <path d="M5.25 19.5a6.75 6.75 0 0 1 13.5 0" />
      </>
    );
  } else if (name === 'designs') {
    iconBody = (
      <>
        <path d="M12 3.75 19.5 8.25v7.5L12 20.25 4.5 15.75v-7.5L12 3.75Z" />
        <path d="M12 9v6M8.75 12h6.5" />
      </>
    );
  } else if (name === 'masters') {
    iconBody = (
      <>
        <path d="M4.5 6.75h15M4.5 12h15M4.5 17.25h15" />
        <circle cx="8.25" cy="6.75" r="1.5" />
        <circle cx="15.75" cy="12" r="1.5" />
        <circle cx="10.5" cy="17.25" r="1.5" />
      </>
    );
  } else if (name === 'orders') {
    iconBody = (
      <>
        <rect x="6" y="4.5" width="12" height="15" rx="1.75" />
        <path d="M9 8.25h6M9 12h6M9 15.75h4.5" />
      </>
    );
  } else if (name === 'pricing') {
    iconBody = (
      <>
        <path d="M6 18V12.75M12 18V9M18 18v-4.5M4.5 18.75h15" />
        <path d="M12 4.5v10.5M14.625 6.75H10.5a2.25 2.25 0 0 0 0 4.5h3a2.25 2.25 0 1 1 0 4.5H9.375" />
      </>
    );
  }

  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
        isActive
          ? 'border-white/40 bg-white/20 text-white'
          : 'border-white/20 bg-white/10 text-white/80 group-hover:border-white/35 group-hover:bg-white/15 group-hover:text-white'
      }`}
    >
      <svg {...iconBase}>{iconBody}</svg>
    </span>
  );
}

export default function Sidebar({
  collapsed = false,
  onToggle,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
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
    <div
      className={`fixed left-0 top-0 z-30 h-screen w-72 border-r border-blue-700/40 bg-gradient-to-b from-blue-700 via-blue-600 to-cyan-700 text-white transition-all duration-300 lg:w-auto ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        collapsed ? 'lg:w-20' : 'lg:w-64'
      } lg:translate-x-0`}
    >
      <div
        className={`relative flex items-center border-b border-white/20 ${
          collapsed ? 'justify-center px-2 py-4 lg:px-2' : 'justify-between px-4 py-4'
        }`}
      >
        <h1 className={`font-bold text-white ${collapsed ? 'text-base lg:text-base' : 'text-xl'}`}>
          <span className={collapsed ? 'lg:hidden' : ''}>Jewelry Platform</span>
          {collapsed ? <span className="hidden lg:inline">JP</span> : null}
        </h1>
        <button
          type="button"
          onClick={onToggle}
          className={`hidden h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 lg:inline-flex ${
            collapsed ? 'absolute -right-3 top-4 bg-blue-700 shadow' : ''
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 lg:hidden"
          aria-label="Close navigation"
          title="Close navigation"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className={`space-y-1 ${collapsed ? 'p-4 lg:p-2' : 'p-4'}`}>
        {visibleNavigation.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onCloseMobile?.()}
              className={`group flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
                collapsed ? 'lg:justify-center lg:gap-0 lg:px-2' : ''
              } ${
                isActive
                  ? 'bg-white/20 text-white font-semibold shadow-sm'
                  : 'text-white/85 hover:bg-white/10 hover:text-white'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <MenuIcon name={item.icon} isActive={isActive} />
              <span className={collapsed ? 'lg:hidden' : ''}>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
