import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getStoredUser } from '../../utils/auth';

interface HeaderProps {
  sidebarCollapsed?: boolean;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function Header({ sidebarCollapsed = false }: HeaderProps) {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Admin';
  const initials = user ? getInitials(user.firstName, user.lastName) : 'A';

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className={`fixed top-0 right-0 z-10 h-16 border-b border-gray-200 bg-white transition-all duration-300 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Super Admin Portal</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
              {initials}
            </div>
            <span className="text-sm font-medium text-gray-700">{displayName}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
