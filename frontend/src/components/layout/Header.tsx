import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getStoredUser } from '../../utils/auth';

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function Header() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Admin';
  const initials = user ? getInitials(user.firstName, user.lastName) : 'A';

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <header className="bg-white border-b border-gray-200 h-16 fixed top-0 right-0 left-64 z-10">
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
