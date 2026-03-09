import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getStoredUser } from '../../utils/auth';

interface HeaderProps {
  sidebarCollapsed?: boolean;
  onOpenMobileSidebar?: () => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function Header({ sidebarCollapsed = false, onOpenMobileSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Admin';
  const initials = user ? getInitials(user.firstName, user.lastName) : 'A';
  const desktopOffsetClass = sidebarCollapsed ? 'lg:left-20' : 'lg:left-64';

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-10 h-16 border-b border-blue-200 bg-amber-50/95 backdrop-blur-sm transition-all duration-300 ${desktopOffsetClass}`}
    >
      <div className="flex h-full items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-blue-200 bg-white text-blue-800 hover:bg-blue-50 lg:hidden"
            aria-label="Open navigation"
            title="Open navigation"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-blue-900 sm:text-base lg:text-lg">Super Admin Portal</h2>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {initials}
            </div>
            <span className="hidden text-sm font-medium text-slate-700 sm:inline">{displayName}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-medium text-blue-800 hover:text-blue-900 sm:text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
