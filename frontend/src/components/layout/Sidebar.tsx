import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TaskPermission, UserRole } from '../../types/auth.types';
import { getStoredUser, hasTaskPermission } from '../../utils/auth';
import BlitzBrand from '../common/BlitzBrand';

type MenuIconName =
  | 'dashboard'
  | 'companies'
  | 'branches'
  | 'users'
  | 'designs'
  | 'masters'
  | 'orders'
  | 'spiff';

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
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard', allowedRoles: ['SUPER_ADMIN', 'INTERNAL_REP'] },
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
    permission: 'BRANCH_MANAGEMENT',
    allowedRoles: ['SUPER_ADMIN', 'INTERNAL_REP', 'COMPANY_ADMIN'],
  },
  {
    name: 'Users',
    path: '/users',
    icon: 'users',
    permission: 'USER_MANAGEMENT',
    allowedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  },
  { name: 'Designs', path: '/products', icon: 'designs', permission: 'DESIGN_ENTRIES' },
  { name: 'Masters', path: '/masters/design', icon: 'masters', permission: 'DESIGN_ENTRIES' },
  { name: 'Orders', path: '/orders', icon: 'orders', permission: 'ORDER_ENTRIES' },
  { name: 'SPIFF', path: '/spiff', icon: 'spiff', permission: 'ORDER_ENTRIES' },
];

function MenuIcon({ name, isActive }: { name: MenuIconName; isActive: boolean }) {
  const iconBase = {
    className: 'h-[18px] w-[18px]',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  let iconBody: ReactNode = null;
  if (name === 'dashboard') {
    iconBody = (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    );
  } else if (name === 'companies') {
    iconBody = (
      <>
        <path d="M4 20h16" />
        <path d="M6 20V5a1 1 0 011-1h10a1 1 0 011 1v15" />
        <path d="M9 8h2M9 12h2M9 16h2M13 8h2M13 12h2M13 16h2" />
      </>
    );
  } else if (name === 'branches') {
    iconBody = (
      <>
        <circle cx="7" cy="7" r="2" />
        <circle cx="17" cy="7" r="2" />
        <circle cx="17" cy="17" r="2" />
        <path d="M9 7h6M7 9v6a2 2 0 002 2h6" />
      </>
    );
  } else if (name === 'users') {
    iconBody = (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 20a7 7 0 0114 0" />
      </>
    );
  } else if (name === 'designs') {
    iconBody = (
      <>
        <path d="M12 3l7.5 4v9.5L12 21l-7.5-4.5V7L12 3z" />
        <path d="M12 8.5v6.5M8.5 12h6.5" />
      </>
    );
  } else if (name === 'masters') {
    iconBody = (
      <>
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
        <circle cx="10" cy="9" r="2" />
        <circle cx="16" cy="15" r="2" />
      </>
    );
  } else if (name === 'orders') {
    iconBody = (
      <>
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    );
  } else if (name === 'spiff') {
    iconBody = (
      <>
        <path d="M12 3l2.6 5.2L20 9l-4 4 .9 5.6L12 16l-4.9 2.6L8 13 4 9l5.4-.8L12 3z" />
      </>
    );
  }

  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-[#b98e45] text-white shadow-sm ring-1 ring-[#d7be94]'
          : 'bg-transparent text-[#b7aa98] group-hover:bg-[#3b3027] group-hover:text-white'
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
      className={`fixed left-0 top-0 z-50 h-screen border-r border-slate-800/50 bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out lg:w-auto ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        collapsed ? 'lg:w-20' : 'lg:w-64'
      } lg:translate-x-0 shadow-2xl flex flex-col`}
      style={{
        background: 'linear-gradient(180deg, #171311 0%, #221b17 100%)',
        borderRightColor: '#352b24',
      }}
    >
      <div
        className={`relative flex items-center shrink-0 border-b border-white/5 ${
          collapsed ? 'justify-center py-5 h-16' : 'justify-between px-6 py-5 h-16'
        }`}
      >
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className={`${collapsed ? '' : 'max-w-[170px]'} overflow-hidden`}>
            <BlitzBrand compact subtitle="NEW YORK CITY" className={`sidebar-blitz ${collapsed ? 'scale-90' : ''}`} />
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#4b3a2d] bg-[#2a211b] text-[#d3c8ba] transition-colors hover:bg-[#3a2f26] lg:hidden"
          aria-label="Close navigation"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-5">
        <nav className={`space-y-1.5 ${collapsed ? 'px-3' : 'px-4'}`}>
          {visibleNavigation.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onCloseMobile?.()}
                className={`group flex items-center gap-3.5 rounded-xl transition-all duration-200 ${
                  collapsed ? 'justify-center p-2.5' : 'px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#2f261f] text-white font-semibold border border-[#4a3a2d]'
                    : 'text-[#b8ab9a] hover:text-white hover:bg-[#2c231c]'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <MenuIcon name={item.icon} isActive={isActive} />
                <span className={`tracking-wide whitespace-nowrap ${collapsed ? 'hidden lg:hidden' : 'text-[0.9rem]'}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`shrink-0 border-t border-[#352b24] p-4 ${collapsed ? 'flex justify-center' : ''}`}>
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-3 rounded-xl border border-[#4b3a2d] bg-[#2a211b] p-2.5 text-xs font-semibold uppercase tracking-wider text-[#b9ac9a] transition-all hover:bg-[#3a2f26] hover:text-white ${
            collapsed ? 'w-full justify-center' : 'w-full'
          }`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`h-[18px] w-[18px] transition-transform duration-300 shrink-0 ${collapsed ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className={`whitespace-nowrap ${collapsed ? 'hidden lg:hidden' : ''}`}>
            Collapse
          </span>
        </button>
      </div>
    </div>
  );
}
