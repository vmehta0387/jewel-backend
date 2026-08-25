import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TaskPermission, UserRole } from '../../types/auth.types';
import { getStoredUser, hasActionPermission, hasTaskPermission } from '../../utils/auth';
import BlitzBrand from '../common/BlitzBrand';

type MenuIconName =
  | 'dashboard'
  | 'notifications'
  | 'companies'
  | 'branches'
  | 'users'
  | 'designs'
  | 'masters'
  | 'orders'
  | 'activity'
  | 'spiff';

interface NavigationItem {
  name: string;
  path: string;
  icon: MenuIconName;
  permission?: TaskPermission;
  actionPermission?: string;
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
    actionPermission: 'company.view',
    allowedRoles: ['SUPER_ADMIN', 'INTERNAL_REP'],
  },
  {
    name: 'Branches',
    path: '/branches',
    icon: 'branches',
    permission: 'BRANCH_MANAGEMENT',
    actionPermission: 'branch.view',
    allowedRoles: ['SUPER_ADMIN', 'INTERNAL_REP', 'COMPANY_ADMIN'],
  },
  {
    name: 'Users',
    path: '/users',
    icon: 'users',
    permission: 'USER_MANAGEMENT',
    actionPermission: 'user.view',
    allowedRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  },
  { name: 'Notifications', path: '/notifications', icon: 'notifications' },
  { name: 'Designs', path: '/products', icon: 'designs', permission: 'DESIGN_ENTRIES' },
  { name: 'Masters', path: '/masters/design', icon: 'masters', permission: 'DESIGN_ENTRIES', actionPermission: 'master.view' },
  { name: 'Orders', path: '/orders', icon: 'orders' },
  { name: 'Activity', path: '/activity-events', icon: 'activity', allowedRoles: ['SUPER_ADMIN'] },
  { name: 'SPIFF', path: '/spiff', icon: 'spiff', permission: 'ORDER_ENTRIES', actionPermission: 'spiff.view' },
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
  } else if (name === 'notifications') {
    iconBody = (
      <>
        <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M9 17a3 3 0 0 0 6 0" />
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
  } else if (name === 'activity') {
    iconBody = (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15l3-4 3 2 4-7" />
        <circle cx="8" cy="15" r="1" />
        <circle cx="11" cy="11" r="1" />
        <circle cx="14" cy="13" r="1" />
        <circle cx="18" cy="6" r="1" />
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
    if (!user) {
      return false;
    }

    if (item.allowedRoles && !item.allowedRoles.includes(user.role)) {
      return false;
    }

    if (item.permission && !hasTaskPermission(user, item.permission)) {
      return false;
    }

    if (item.actionPermission && !hasActionPermission(user, item.actionPermission)) {
      return false;
    }

    return true;
  });

  return (
    <div
      className={`fixed left-0 top-0 z-50 flex h-screen w-[205px] flex-col border-r border-slate-800/50 bg-slate-950 text-slate-300 shadow-2xl transition-[width,transform] duration-300 ease-in-out ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        collapsed ? 'lg:w-20' : 'lg:w-[205px]'
      } lg:translate-x-0`}
      style={{
        background: 'linear-gradient(180deg, #171311 0%, #221b17 100%)',
        borderRightColor: '#352b24',
      }}
    >
      <div
        className={`relative flex items-center shrink-0 border-b border-white/5 ${
          collapsed ? 'justify-between px-6 py-5 h-16 lg:justify-center lg:px-0' : 'justify-between px-6 py-5 h-16'
        }`}
      >
        <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
          <div className={`${collapsed ? '' : 'max-w-[170px]'} overflow-hidden`}>
            <BlitzBrand
              compact
              subtitle="NEW YORK CITY"
              className={`sidebar-blitz ${collapsed ? 'sidebar-blitz-collapsed' : ''}`}
            />
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
        <nav className={`space-y-1.5 px-4 ${collapsed ? 'lg:px-3' : ''}`}>
          {visibleNavigation.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onCloseMobile?.()}
                className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 transition-all duration-200 ${
                  collapsed ? 'lg:justify-center lg:p-2.5' : ''
                } ${
                  isActive
                    ? 'bg-[#2f261f] text-white font-semibold border border-[#4a3a2d]'
                    : 'text-[#b8ab9a] hover:text-white hover:bg-[#2c231c]'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <MenuIcon name={item.icon} isActive={isActive} />
                <span className={`whitespace-nowrap text-[0.9rem] tracking-wide ${collapsed ? 'lg:hidden' : ''}`}>
                  {item.name}
                </span>
                {collapsed ? (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-lg border border-[#4a3a2d] bg-[#211a16] px-3 py-2 text-xs font-semibold tracking-wide text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
                  >
                    {item.name}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`shrink-0 border-t border-[#352b24] p-4 ${collapsed ? 'lg:flex lg:justify-center lg:px-3' : ''}`}>
        <button
          type="button"
          onClick={onToggle}
          className={`flex items-center gap-3 rounded-xl border border-[#4b3a2d] bg-[#2a211b] p-2.5 text-xs font-semibold uppercase tracking-wider text-[#b9ac9a] transition-all hover:bg-[#3a2f26] hover:text-white ${
            collapsed ? 'w-full lg:justify-center' : 'w-full'
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
          <span className={`whitespace-nowrap ${collapsed ? 'lg:hidden' : ''}`}>
            Collapse
          </span>
        </button>
      </div>
    </div>
  );
}
