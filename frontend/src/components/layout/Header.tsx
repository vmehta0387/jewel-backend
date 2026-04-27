import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { clearAuthSession, getStoredUser, getToken, saveAuthSession } from '../../utils/auth';
import Avatar from '../common/Avatar';

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
}

export default function Header({ onOpenMobileSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState(getStoredUser());
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Admin';

  const refreshCurrentUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await api.get('/auth/me');
      const nextUser = response.data;
      setUser(nextUser);
      saveAuthSession(token, nextUser);
    } catch (error) {
      console.error('Failed to refresh current user profile', error);
    }
  }, []);

  useEffect(() => {
    void refreshCurrentUser();

    const onFocus = () => {
      void refreshCurrentUser();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'auth_user') {
        setUser(getStoredUser());
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshCurrentUser();
    }, 120000);

    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [refreshCurrentUser]);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user) return;

    const token = getToken();
    if (!token) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingPhoto(true);
    try {
      const response = await api.post('/auth/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const nextUser = response.data;
      setUser(nextUser);
      saveAuthSession(token, nextUser);
    } catch (error) {
      console.error('Failed to upload profile photo', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-white/40 shadow-glass-nav h-16 transition-all duration-300">
      <div className="flex h-full items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 lg:hidden transition-all shadow-sm border border-slate-200 hover-lift"
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h2 className="hidden sm:block text-base font-bold tracking-tight text-slate-800 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">
            Admin Portal
          </h2>
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3 cursor-default">
            <div className="flex flex-col items-end">
              <span className="hidden text-sm font-bold text-slate-700 sm:block leading-tight">{displayName}</span>
              <span className="hidden text-[0.65rem] font-bold tracking-wider uppercase text-indigo-500 sm:block leading-tight mt-0.5">Admin Role</span>
            </div>
            
            <button
              type="button"
              title={uploadingPhoto ? 'Uploading...' : 'Upload profile photo'}
              onClick={() => photoInputRef.current?.click()}
              className="rounded-full"
              disabled={uploadingPhoto}
            >
              <Avatar
                name={displayName}
                src={user?.photoUrl || undefined}
                size="sm"
                className="min-w-[36px] min-h-[36px] shadow-soft ring-2 ring-white transition-transform hover:scale-105"
              />
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          
          <div className="h-6 w-px bg-slate-200 hidden sm:block relative top-0.5"></div>
          
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-rose-600 transition-colors py-1.5 px-3 rounded-xl hover:bg-rose-50"
          >
            <svg className="h-[1.125rem] w-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span className="hidden sm:inline translate-y-[1px]">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
