import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';
import { useAuth } from '../context/AuthContext';
import {
  getOrderIdFromNotification,
  getSpiffClaimTargetFromNotification,
  mapNotificationsToEntries,
  type NotificationFeedEntry,
  type NotificationTone,
} from '../utils/appNotifications';
import {
  trackNotificationAction,
  trackNotificationListViewed,
  trackNotificationViewed,
} from '../utils/activityEvents';

type Props = {
  visible: boolean;
  onClose: () => void;
  onOpenNotification?: (entry: NotificationFeedEntry) => void;
};

type NotificationFilter = 'unread' | 'all';

const NOTIFICATIONS_PAGE_SIZE = 25;

const getNotificationCardStyle = (tone: NotificationTone) => {
  if (tone === 'alertGold') return [styles.notificationCardBase, styles.notificationCardGold];
  if (tone === 'alertRed') return [styles.notificationCardBase, styles.notificationCardRed];
  if (tone === 'info') return [styles.notificationCardBase, styles.notificationCardInfo];
  if (tone === 'promo') return [styles.notificationCardBase, styles.notificationCardPromo];
  return [styles.notificationCardBase, styles.notificationCardNeutral];
};

const getNotificationDotStyle = (tone: NotificationTone) => {
  if (tone === 'alertGold') return [styles.notificationDot, styles.notificationDotGold];
  if (tone === 'alertRed') return [styles.notificationDot, styles.notificationDotRed];
  if (tone === 'info') return [styles.notificationDot, styles.notificationDotInfo];
  if (tone === 'promo') return [styles.notificationDot, styles.notificationDotPromo];
  return [styles.notificationDot, styles.notificationDotNeutral];
};

type NotificationCardProps = {
  entry: NotificationFeedEntry;
  onOpen: (entry: NotificationFeedEntry) => void;
  onMarkRead: (entry: NotificationFeedEntry) => void;
};

const NotificationCard = memo<NotificationCardProps>(({ entry, onOpen, onMarkRead }) => {
  const card = (
    <TouchableOpacity
      style={[getNotificationCardStyle(entry.tone), entry.isRead && styles.notificationCardRead]}
      onPress={() => onOpen(entry)}
      activeOpacity={0.88}
    >
      <View style={styles.notificationCardTopRow}>
        <View style={[getNotificationDotStyle(entry.tone), entry.isRead && styles.notificationDotRead]} />
        <Text style={[styles.notificationCardTitle, entry.isRead && styles.notificationCardTitleRead]} numberOfLines={1}>
          {entry.title}
        </Text>
      </View>
      <Text style={[styles.notificationCardSubtitle, entry.isRead && styles.notificationCardSubtitleRead]}>
        {entry.subtitle}
      </Text>
      <Text style={[styles.notificationCardTime, entry.isRead && styles.notificationCardTimeRead]}>
        {entry.time}
      </Text>
    </TouchableOpacity>
  );


  const renderSwipeReadAction = useCallback(
    (progress: any) => {
      const opacity = progress.interpolate({
        inputRange: [0, 0.25, 1],
        outputRange: [0, 0.01, 0.01],
        extrapolate: 'clamp',
      });

      return <Animated.View style={[styles.swipeReadActionSpacer, { opacity }]} />;
    },
    [],
  );

  if (entry.isRead) {
    return <View style={styles.notificationCardSpacing}>{card}</View>;
  }

  return (
    <View style={styles.notificationSwipeShell}>
      <View style={styles.swipeReadFullBack}>
        <View style={styles.swipeReadFullSide}>
          <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
          <Text style={styles.swipeReadActionText}>Read</Text>
        </View>
        <View style={styles.swipeReadFullSide}>
          <Text style={styles.swipeReadActionText}>Read</Text>
          <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
        </View>
      </View>
      <Swipeable
        overshootLeft={false}
        overshootRight={false}
        friction={1.5}
        leftThreshold={40}
        rightThreshold={40}
        onSwipeableOpen={() => {
          onMarkRead(entry);
        }}
        renderLeftActions={renderSwipeReadAction}
        renderRightActions={renderSwipeReadAction}
      >
        {card}
      </Swipeable>
    </View>
  );
});

const NotificationPopover: React.FC<Props> = ({ visible, onClose, onOpenNotification }) => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entries, setEntries] = useState<NotificationFeedEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('unread');
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const markingReadIds = useRef(new Set<string>());

  const loadNotifications = useCallback(async (nextPage = 1) => {
    if (!token) {
      setEntries([]);
      setUnreadCount(0);
      setPage(1);
      setTotalPages(1);
      setLoadError('Sign in again to load notifications.');
      return;
    }

    if (nextPage === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setLoadError(null);
    try {
      const response = await fetchNotifications(token, nextPage, NOTIFICATIONS_PAGE_SIZE, activeFilter === 'unread');
      const items = Array.isArray(response.data) ? response.data : [];
      const nextEntries = mapNotificationsToEntries(items);
      setEntries((current) => (nextPage === 1 ? nextEntries : [...current, ...nextEntries]));
      setPage(response.page || nextPage);
      setTotalPages(Math.max(1, response.totalPages || 1));
      setUnreadCount(Number.isFinite(response.unreadCount) ? response.unreadCount : 0);
      trackNotificationListViewed({
        filter: activeFilter,
        page: response.page || nextPage,
        total: response.total || nextEntries.length,
        resultCount: nextEntries.length,
      });
    } catch {
      if (nextPage === 1) {
        setEntries([]);
      }
      setLoadError('Unable to load notifications.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeFilter, token]);

  useEffect(() => {
    if (visible) {
      void loadNotifications();
    }
  }, [loadNotifications, visible]);

  const alerts = useMemo(
    () => entries.filter((entry) => entry.tone === 'alertGold' || entry.tone === 'alertRed'),
    [entries],
  );
  const recentActivity = useMemo(
    () => entries.filter((entry) => entry.tone === 'neutral'),
    [entries],
  );
  const updates = useMemo(
    () => entries.filter((entry) => entry.tone === 'info' || entry.tone === 'promo'),
    [entries],
  );
  const hasAnyNotifications = alerts.length || recentActivity.length || updates.length;
  const canMarkAllRead = Boolean(token && unreadCount > 0 && !loading);
  const canLoadMore = Boolean(!loading && !loadingMore && page < totalPages);

  const handleMarkAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      trackNotificationAction('all', 'MARK_ALL_READ', {
        filter: activeFilter,
        unreadCount,
      });
      await loadNotifications();
    } catch {
      // Keep the sheet usable even if mark-all fails.
    }
  }, [loadNotifications, token]);

  const handleSelectFilter = useCallback((nextFilter: NotificationFilter) => {
    setEntries([]);
    setPage(1);
    setTotalPages(1);
    setActiveFilter(nextFilter);
  }, []);

  const navigateFromEntry = useCallback(
    (entry: NotificationFeedEntry) => {
      const orderId = getOrderIdFromNotification(entry);
      if (orderId) {
        navigation.navigate('OrdersTab', {
          screen: 'OrderDetail',
          params: { orderId },
        });
        return true;
      }

      const spiffTarget = getSpiffClaimTargetFromNotification(entry);
      if (spiffTarget) {
        navigation.navigate('DashboardTab', {
          screen: 'SpiffRewards',
          params: spiffTarget,
        });
        return true;
      }

      return false;
    },
    [navigation],
  );

  const handleOpenEntry = useCallback(
    (entry: NotificationFeedEntry) => {
      if (token && !entry.isRead) {
        setEntries((current) =>
          current.map((item) => (item.notificationId === entry.notificationId ? { ...item, isRead: true } : item)),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
        void markNotificationRead(token, entry.notificationId, true).catch(() => {
          // Keep navigation responsive even if the read-state update fails.
        });
        trackNotificationAction(entry.notificationId, 'MARK_READ', {
          source: 'NotificationPopover',
        });
      }
      onClose();
      trackNotificationViewed(entry.notificationId, {
        source: 'NotificationPopover',
        title: entry.title,
      });
      const handled = navigateFromEntry(entry);
      if (handled) {
        trackNotificationAction(entry.notificationId, 'ACTION_OPENED', {
          source: 'NotificationPopover',
        });
      }
      if (!handled) {
        onOpenNotification?.(entry);
      }
    },
    [navigateFromEntry, onClose, onOpenNotification, token],
  );

  const handleSwipeMarkRead = useCallback(async (entry: NotificationFeedEntry) => {
    if (!token || entry.isRead || markingReadIds.current.has(entry.notificationId)) {
      return;
    }

    markingReadIds.current.add(entry.notificationId);
    setEntries((current) =>
      activeFilter === 'unread'
        ? current.filter((item) => item.notificationId !== entry.notificationId)
        : current.map((item) =>
            item.notificationId === entry.notificationId ? { ...item, isRead: true } : item,
          ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await markNotificationRead(token, entry.notificationId, true);
      trackNotificationAction(entry.notificationId, 'MARK_READ', {
        source: 'NotificationPopover',
        gesture: 'swipe',
      });
    } catch {
      await loadNotifications();
    } finally {
      markingReadIds.current.delete(entry.notificationId);
    }
  }, [activeFilter, loadNotifications, token]);

  const handleRetry = useCallback(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleLoadMore = useCallback(() => {
    if (canLoadMore) {
      void loadNotifications(page + 1);
    }
  }, [canLoadMore, loadNotifications, page]);

  const renderSection = (title: string, items: NotificationFeedEntry[]) => {
    if (!items.length) return null;

    return (
      <View style={styles.notificationSection}>
        <Text style={styles.notificationSectionLabel}>{title}</Text>
        {items.map((entry) => (
          <NotificationCard
            key={entry.id}
            entry={entry}
            onOpen={handleOpenEntry}
            onMarkRead={handleSwipeMarkRead}
          />
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalOverlayLock}>
            <TouchableWithoutFeedback>
              <View style={[styles.notificationsWindow, { width: Math.min(338, width - 20) }]}>
                <View style={styles.notificationsHeaderRow}>
                  <Text style={styles.notificationsTitle}>Notifications</Text>
                  <View style={styles.filterTabs}>
                    <TouchableOpacity
                      style={[styles.filterTab, activeFilter === 'unread' && styles.filterTabActive]}
                      onPress={() => handleSelectFilter('unread')}
                      activeOpacity={0.86}
                      disabled={loading && activeFilter === 'unread'}
                    >
                      <Text style={[styles.filterTabText, activeFilter === 'unread' && styles.filterTabTextActive]}>
                        Unread
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
                      onPress={() => handleSelectFilter('all')}
                      activeOpacity={0.86}
                      disabled={loading && activeFilter === 'all'}
                    >
                      <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
                        All
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.85} disabled={!canMarkAllRead}>
                    <Text style={[styles.markReadText, !canMarkAllRead && styles.markReadTextDisabled]}>
                      Mark all read
                    </Text>
                  </TouchableOpacity>
                </View>

                {loading ? (
                  <View style={styles.emptyNotifBox}>
                    <ActivityIndicator color="#B2874A" />
                  </View>
                ) : loadError ? (
                  <View style={styles.emptyNotifBox}>
                    <Ionicons name="cloud-offline-outline" size={20} color="#B2874A" />
                    <Text style={styles.emptyNotifString}>{loadError}</Text>
                    {token ? (
                      <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.85}>
                        <Ionicons name="refresh" size={13} color="#FFFFFF" />
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : hasAnyNotifications ? (
                  <ScrollView style={styles.notificationsScroll} showsVerticalScrollIndicator={false}>
                    {renderSection('ALERTS', alerts)}
                    {renderSection('RECENT ACTIVITY', recentActivity)}
                    {renderSection('UPDATES', updates)}
                    {canLoadMore || loadingMore ? (
                      <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={handleLoadMore}
                        activeOpacity={0.86}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <ActivityIndicator color="#B2874A" size="small" />
                        ) : (
                          <Text style={styles.loadMoreText}>Load more</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyNotifBox}>
                    <Text style={styles.emptyNotifString}>
                      {activeFilter === 'unread' ? 'No unread notifications' : 'No recent activity'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlayLock: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  notificationsWindow: {
    position: 'absolute',
    top: 80,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  notificationsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  notificationsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1C18',
    flexShrink: 0,
  },
  markReadText: {
    fontSize: 11,
    color: '#B2874A',
    fontWeight: '700',
  },
  markReadTextDisabled: {
    color: '#BDB5AC',
  },
  filterTabs: {
    width: 106,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F1EC',
    borderRadius: 13,
    padding: 2,
  },
  filterTab: {
    flex: 1,
    minHeight: 24,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  filterTabText: {
    color: '#857A70',
    fontSize: 10,
    fontWeight: '800',
  },
  filterTabTextActive: {
    color: '#2E2924',
  },
  notificationsScroll: {
    maxHeight: 460,
  },
  notificationSection: {
    marginBottom: 12,
  },
  notificationSectionLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#8F877E',
    fontWeight: '700',
    marginBottom: 6,
  },
  notificationCardBase: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  notificationCardSpacing: {
    marginBottom: 8,
  },
  notificationSwipeShell: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeReadFullBack: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: '#2F9B63',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  swipeReadFullSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  swipeReadActionSpacer: {
    width: '100%',
    minHeight: 72,
  },
  swipeReadActionText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  notificationCardGold: {
    backgroundColor: '#FCF7EC',
    borderColor: '#FFFFFF',
  },
  notificationCardRed: {
    backgroundColor: '#FDF2F3',
    borderColor: '#FFFFFF',
  },
  notificationCardNeutral: {
    backgroundColor: '#F8F8F8',
    borderColor: '#FFFFFF',
  },
  notificationCardInfo: {
    backgroundColor: '#ECF3FF',
    borderColor: '#FFFFFF',
  },
  notificationCardPromo: {
    backgroundColor: '#F8F4EC',
    borderColor: '#FFFFFF',
  },
  notificationCardRead: {
    backgroundColor: '#FAFAFA',
    opacity: 0.78,
  },
  notificationCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  notificationDotGold: {
    backgroundColor: '#C59A44',
  },
  notificationDotRed: {
    backgroundColor: '#DE5858',
  },
  notificationDotNeutral: {
    backgroundColor: '#9A9188',
  },
  notificationDotInfo: {
    backgroundColor: '#5D86C7',
  },
  notificationDotPromo: {
    backgroundColor: '#C49B52',
  },
  notificationDotRead: {
    backgroundColor: '#C7C0B8',
  },
  notificationCardTitle: {
    flex: 1,
    fontSize: 11,
    color: '#2D2823',
    fontWeight: '700',
  },
  notificationCardTitleRead: {
    color: '#6F675F',
    fontWeight: '600',
  },
  notificationCardSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: '#6C645B',
  },
  notificationCardSubtitleRead: {
    color: '#8A8178',
  },
  notificationCardTime: {
    fontSize: 11,
    color: '#8E867D',
    marginTop: 2,
  },
  notificationCardTimeRead: {
    color: '#A8A199',
  },
  emptyNotifBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyNotifString: {
    color: '#8A8178',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    backgroundColor: '#B2874A',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  loadMoreButton: {
    minHeight: 34,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4D8CA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loadMoreText: {
    color: '#B2874A',
    fontSize: 11,
    fontWeight: '800',
  },
});

export default NotificationPopover;
