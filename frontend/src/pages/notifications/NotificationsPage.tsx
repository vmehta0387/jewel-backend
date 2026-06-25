import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notifications';
import type { NotificationItem } from '../../types/notification.types';
import {
  formatNotificationTime,
  getNotificationSection,
  getNotificationToneClasses,
  resolveNotificationPath,
} from '../../utils/notifications';

type NotificationFilter = 'ALL' | 'UNREAD' | 'ALERTS' | 'UPDATES';
const broadcastNotificationsChanged = () => window.dispatchEvent(new Event('notifications:changed'));

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const [search, setSearch] = useState('');
  const [processingIds, setProcessingIds] = useState<Record<string, boolean>>({});

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchNotifications(1, 100, false);
      setNotifications(response.data || []);
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(Array.isArray(message) ? message.join(', ') : message || 'Unable to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);
  const alertsCount = useMemo(
    () => notifications.filter((item) => getNotificationSection(item) === 'ALERTS').length,
    [notifications],
  );
  const updatesCount = useMemo(
    () => notifications.filter((item) => getNotificationSection(item) === 'UPDATES').length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notifications.filter((item) => {
      const matchesFilter =
        filter === 'ALL'
          ? true
          : filter === 'UNREAD'
            ? !item.isRead
            : filter === 'ALERTS'
              ? getNotificationSection(item) === 'ALERTS'
              : getNotificationSection(item) === 'UPDATES';

      if (!matchesFilter) return false;
      if (!term) return true;

      const haystack = [item.title, item.message, item.type, item.entityType]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [filter, notifications, search]);

  const setProcessing = (id: string, next: boolean) => {
    setProcessingIds((prev) => {
      const copy = { ...prev };
      if (next) copy[id] = true;
      else delete copy[id];
      return copy;
    });
  };

  const handleOpenNotification = async (item: NotificationItem) => {
    try {
      if (!item.isRead) {
        setProcessing(item.id, true);
        await markNotificationRead(item.id, true);
        setNotifications((prev) =>
          prev.map((entry) => (entry.id === item.id ? { ...entry, isRead: true, readAt: new Date().toISOString() } : entry)),
        );
        broadcastNotificationsChanged();
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    } finally {
      setProcessing(item.id, false);
    }

    navigate(resolveNotificationPath(item));
  };

  const handleToggleRead = async (item: NotificationItem) => {
    try {
      setProcessing(item.id, true);
      await markNotificationRead(item.id, !item.isRead);
      setNotifications((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? { ...entry, isRead: !entry.isRead, readAt: !entry.isRead ? new Date().toISOString() : null }
            : entry,
        ),
      );
      broadcastNotificationsChanged();
    } catch (error) {
      console.error('Failed to toggle notification read state', error);
    } finally {
      setProcessing(item.id, false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
          readAt: item.readAt || new Date().toISOString(),
        })),
      );
      broadcastNotificationsChanged();
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Notifications</h1>
          <p className="text-sm text-slate-600">
            Review order, SPIFF, and account events in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void loadNotifications()}>
            Refresh
          </Button>
          <Button type="button" onClick={handleMarkAllRead} disabled={!unreadCount}>
            Mark All Read
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ab8b57]">All</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{notifications.length}</p>
          <p className="mt-1 text-xs text-slate-500">Total notifications</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ab8b57]">Unread</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{unreadCount}</p>
          <p className="mt-1 text-xs text-slate-500">Needs attention</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ab8b57]">Alerts</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{alertsCount}</p>
          <p className="mt-1 text-xs text-slate-500">Approval and critical items</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ab8b57]">Updates</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{updatesCount}</p>
          <p className="mt-1 text-xs text-slate-500">Status and workflow updates</p>
        </Card>
      </div>

      <Card title="Notification Feed">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'ALL', label: 'All' },
                { key: 'UNREAD', label: 'Unread' },
                { key: 'ALERTS', label: 'Alerts' },
                { key: 'UPDATES', label: 'Updates' },
              ] as Array<{ key: NotificationFilter; label: string }>).map((item) => {
                const active = filter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilter(item.key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'bg-[#1f1a16] text-white shadow-sm'
                        : 'border border-[#ddcfbf] bg-[#faf7f2] text-[#6f6356] hover:bg-[#f3ebdf]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, message, or type..."
              className="w-full rounded-[1rem] border border-[#dfd3c4] bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#c9a971] lg:max-w-md"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[1.2rem] border border-dashed border-[#e4d7c6] bg-[#fcfaf6] px-4 py-12 text-center text-sm text-[#8a7f72]">
              Loading notifications...
            </div>
          ) : filteredNotifications.length ? (
            <div className="space-y-3">
              {filteredNotifications.map((item) => {
                const tone = getNotificationToneClasses(item);
                const processing = Boolean(processingIds[item.id]);
                return (
                  <div
                    key={item.id}
                    className={`rounded-[1.2rem] border px-4 py-4 transition ${tone.card} ${item.isRead ? 'opacity-85' : ''}`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <button
                        type="button"
                        onClick={() => void handleOpenNotification(item)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      >
                        <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${tone.dot}`} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[#2a221b]">{item.title}</p>
                            {!item.isRead ? (
                              <span className="rounded-full bg-[#f4ead8] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#9f7534]">
                                Unread
                              </span>
                            ) : null}
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#8f8377]">
                              {getNotificationSection(item)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-6 text-[#5f5449]">{item.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.72rem] font-medium text-[#9b8f82]">
                            <span>{formatNotificationTime(item.createdAt)}</span>
                            <span>{item.type}</span>
                            {item.entityType ? <span>{item.entityType}</span> : null}
                          </div>
                        </div>
                      </button>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleToggleRead(item)}
                          disabled={processing}
                        >
                          {item.isRead ? 'Mark Unread' : 'Mark Read'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleOpenNotification(item)}
                          disabled={processing}
                        >
                          Open
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.2rem] border border-dashed border-[#e4d7c6] bg-[#fcfaf6] px-4 py-12 text-center">
              <p className="text-sm font-semibold text-[#4a4037]">No notifications match this view</p>
              <p className="mt-1 text-xs text-[#8a7f72]">Try changing the filter or search term.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
