import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications';
import { createNotificationsSocket, type NotificationUnreadCountPayload } from '../../services/notificationSocket';
import type { AuthUser } from '../../types/auth.types';
import type { NotificationItem } from '../../types/notification.types';
import { clearAuthSession, getStoredUser, getToken, saveAuthSession } from '../../utils/auth';
import {
  formatNotificationTime,
  getNotificationSection,
  getNotificationToneClasses,
  resolveNotificationPath,
} from '../../utils/notifications';
import Avatar from '../common/Avatar';
import BlitzBrand from '../common/BlitzBrand';

interface HeaderProps {
  onOpenMobileSidebar?: () => void;
}

const CURRENT_USER_REFRESH_TTL_MS = 5 * 60 * 1000;
let currentUserRefreshPromise: Promise<AuthUser> | null = null;
let currentUserRefreshAt = 0;
let currentUserRefreshToken = '';

const fetchCurrentUser = async (token: string, force = false) => {
  const now = Date.now();
  const sameToken = currentUserRefreshToken === token;
  if (!force && sameToken && currentUserRefreshAt && now - currentUserRefreshAt < CURRENT_USER_REFRESH_TTL_MS) {
    return null;
  }

  if (!currentUserRefreshPromise || !sameToken) {
    currentUserRefreshToken = token;
    currentUserRefreshPromise = api
      .get<AuthUser>('/auth/me')
      .then((response) => {
        currentUserRefreshAt = Date.now();
        saveAuthSession(token, response.data);
        return response.data;
      })
      .finally(() => {
        currentUserRefreshPromise = null;
      });
  }

  return currentUserRefreshPromise;
};

export default function Header({ onOpenMobileSidebar }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(getStoredUser());
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const notificationsPanelRef = useRef<HTMLDivElement | null>(null);
  const notificationsButtonRef = useRef<HTMLButtonElement | null>(null);
  const notificationsOpenRef = useRef(notificationsOpen);
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Admin';

  useEffect(() => {
    notificationsOpenRef.current = notificationsOpen;
  }, [notificationsOpen]);

  const loadNotifications = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setNotificationsLoading(true);
    try {
      const response = await fetchNotifications(1, 20, false);
      setNotifications(response.data || []);
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load notifications', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const refreshCurrentUser = useCallback(async (force = false) => {
    const token = getToken();
    if (!token) return;

    try {
      const nextUser = await fetchCurrentUser(token, force);
      if (nextUser) {
        setUser(nextUser);
      }
    } catch (error) {
      console.error('Failed to refresh current user profile', error);
    }
  }, []);

  useEffect(() => {
    void refreshCurrentUser();

    const onFocus = () => {
      void refreshCurrentUser();
    };
    const onNotificationsChanged = () => {
      if (notificationsOpen) {
        void loadNotifications();
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === 'auth_user') {
        setUser(getStoredUser());
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('notifications:changed', onNotificationsChanged);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notifications:changed', onNotificationsChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, [loadNotifications, notificationsOpen, refreshCurrentUser]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = createNotificationsSocket(token);
    const handleUnreadCountUpdate = (payload: NotificationUnreadCountPayload) => {
      setUnreadCount(Math.max(0, Number(payload.unreadCount) || 0));
      if (notificationsOpenRef.current) {
        void loadNotifications();
      }
    };

    socket.on('notification.unread_count_updated', handleUnreadCountUpdate);

    return () => {
      socket.off('notification.unread_count_updated', handleUnreadCountUpdate);
      socket.disconnect();
    };
  }, [loadNotifications]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!notificationsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        notificationsPanelRef.current?.contains(target ?? null) ||
        notificationsButtonRef.current?.contains(target ?? null)
      ) {
        return;
      }
      setNotificationsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notificationsOpen]);

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
      currentUserRefreshAt = Date.now();
      setUser(nextUser);
      saveAuthSession(token, nextUser);
    } catch (error) {
      console.error('Failed to upload profile photo', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleOpenNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) {
      await loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    try {
      if (!item.isRead) {
        await markNotificationRead(item.id, true);
        setNotifications((prev) =>
          prev.map((entry) => (entry.id === item.id ? { ...entry, isRead: true, readAt: new Date().toISOString() } : entry)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }

    setNotificationsOpen(false);
    navigate(resolveNotificationPath(item));
  };

  const groupedNotifications = useMemo(() => {
    const alerts = notifications.filter((item) => getNotificationSection(item) === 'ALERTS');
    const updates = notifications.filter((item) => !alerts.includes(item));
    return { alerts, updates };
  }, [notifications]);

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-[#e7ded2] h-16 transition-all duration-300">
      <div className="flex h-full items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#f4f0e9] text-[#6f6356] hover:bg-[#efe5d6] hover:text-[#9f7534] lg:hidden transition-all shadow-sm border border-[#e1d6c7] hover-lift"
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <BlitzBrand compact className="hidden sm:inline-flex" subtitle="NEW YORK CITY" />
        </div>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative">
            <button
              ref={notificationsButtonRef}
              type="button"
              onClick={handleOpenNotifications}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e1d6c7] bg-[#fbf8f2] text-[#766b5f] shadow-sm transition-all hover:border-[#d5c5af] hover:bg-[#f8f1e5] hover:text-[#9f7534]"
              aria-label="Open notifications"
            >
              <svg className="h-[1.1rem] w-[1.1rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M9 17a3 3 0 0 0 6 0" />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-[1.2rem] min-w-[1.2rem] items-center justify-center rounded-full bg-[#cf534f] px-1 text-[0.62rem] font-bold text-white shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div
                ref={notificationsPanelRef}
                className="absolute right-0 top-12 z-50 w-[24rem] rounded-[1.6rem] border border-[#e8dccd] bg-white/95 p-3 shadow-[0_24px_70px_rgba(42,34,27,0.16)] backdrop-blur-xl"
              >
                <div className="flex items-center justify-between px-1 pb-2">
                  <div>
                    <p className="text-sm font-bold text-[#2a221b]">Notifications</p>
                    <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[#ab8b57]">{unreadCount} unread</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-[#9f7534] transition-colors hover:text-[#7f5c28]"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-[28rem] overflow-y-auto pr-1">
                  {notificationsLoading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-[#8a7f72]">
                      Loading notifications...
                    </div>
                  ) : notifications.length ? (
                    <div className="space-y-4">
                      {groupedNotifications.alerts.length ? (
                        <div className="space-y-2">
                          <p className="px-1 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#ab8b57]">Alerts</p>
                          {groupedNotifications.alerts.map((item) => {
                            const tone = getNotificationToneClasses(item);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => void handleNotificationClick(item)}
                                className={`w-full rounded-[1.2rem] border px-3 py-3 text-left transition-all ${tone.card} ${item.isRead ? 'opacity-80' : ''}`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${tone.dot}`} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <p className="truncate text-sm font-semibold text-[#2a221b]">{item.title}</p>
                                      {!item.isRead ? <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#c89d5a]" /> : null}
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-[#6f6356]">{item.message}</p>
                                    <p className="mt-2 text-[0.72rem] font-medium text-[#9b8f82]">{formatNotificationTime(item.createdAt)}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {groupedNotifications.updates.length ? (
                        <div className="space-y-2">
                          <p className="px-1 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[#ab8b57]">Updates</p>
                          {groupedNotifications.updates.map((item) => {
                            const tone = getNotificationToneClasses(item);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => void handleNotificationClick(item)}
                                className={`w-full rounded-[1.2rem] border px-3 py-3 text-left transition-all ${tone.card} ${item.isRead ? 'opacity-80' : ''}`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${tone.dot}`} />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <p className="truncate text-sm font-semibold text-[#2a221b]">{item.title}</p>
                                      {!item.isRead ? <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#c89d5a]" /> : null}
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-[#6f6356]">{item.message}</p>
                                    <p className="mt-2 text-[0.72rem] font-medium text-[#9b8f82]">{formatNotificationTime(item.createdAt)}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-[1.2rem] border border-dashed border-[#e4d7c6] bg-[#fcfaf6] px-4 py-10 text-center">
                      <p className="text-sm font-semibold text-[#4a4037]">No notifications yet</p>
                      <p className="mt-1 text-xs text-[#8a7f72]">Order, SPIFF, and account updates will show up here.</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 border-t border-[#eee6db] pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate('/notifications');
                    }}
                    className="w-full rounded-[1.1rem] border border-[#e1d6c7] bg-[#fbf8f2] px-4 py-2.5 text-sm font-semibold text-[#4b4035] transition hover:border-[#d4c2aa] hover:bg-[#f7f0e4]"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3 cursor-default">
            <div className="flex flex-col items-end">
              <span className="hidden text-sm font-bold text-[#2a221b] sm:block leading-tight">{displayName}</span>
              <span className="hidden text-[0.65rem] font-bold tracking-wider uppercase text-[#a17635] sm:block leading-tight mt-0.5">Admin Role</span>
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
                className="min-w-[36px] min-h-[36px] border border-[#e3dbd1] transition-transform hover:scale-105"
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
          
          <div className="h-6 w-px bg-[#e1d6c7] hidden sm:block relative top-0.5"></div>
          
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#766b5f] hover:text-[#b34b4b] transition-colors py-1.5 px-3 rounded-xl hover:bg-[#fbefef]"
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
