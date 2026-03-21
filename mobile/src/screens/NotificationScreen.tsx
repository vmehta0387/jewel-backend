import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import {
  fetchNotifications,
  type NotificationCategory,
  type NotificationItem,
  type NotificationTone,
} from '../api/notifications';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/RootNavigator';

type FilterKey = 'ALL' | 'UNREAD' | 'ORDERS' | 'UPDATES';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'ORDERS', label: 'Orders' },
  { key: 'UPDATES', label: 'Updates' },
];

const TONE_STYLES: Record<
  NotificationTone,
  {
    iconBg: string;
    iconColor: string;
    dotColor: string;
  }
> = {
  gold: {
    iconBg: '#f5e7d4',
    iconColor: '#8d6a44',
    dotColor: '#bf8f59',
  },
  blue: {
    iconBg: '#e1edf7',
    iconColor: '#416f98',
    dotColor: '#5b8eb8',
  },
  green: {
    iconBg: '#e2efe5',
    iconColor: '#3f7d57',
    dotColor: '#4e9a67',
  },
  rose: {
    iconBg: '#f3e4e3',
    iconColor: '#965f5b',
    dotColor: '#ba7772',
  },
};

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  ORDER: 'Order alert',
  UPDATE: 'Branch update',
};

const buildRelativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'Just now';

  const diffMs = Date.now() - timestamp;
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return 'Yesterday';

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const isToday = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return true;

  const now = new Date();
  const date = new Date(timestamp);

  return (
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  );
};

const resolveIconName = (icon: string): keyof typeof Ionicons.glyphMap =>
  (icon in Ionicons.glyphMap ? icon : 'notifications-outline') as keyof typeof Ionicons.glyphMap;

const NotificationScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('ALL');
  const [readIds, setReadIds] = useState<Record<string, true>>({});
  const itemsRef = useRef<NotificationItem[]>([]);
  const skeletonPulse = useRef(new Animated.Value(0.58)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(skeletonPulse, {
          toValue: 0.58,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [skeletonPulse]);

  const loadNotifications = useCallback(async (options?: { refresh?: boolean }) => {
    const isRefresh = options?.refresh === true;
    const showSkeleton = !hasLoaded && itemsRef.current.length === 0;

    if (!token) {
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else if (showSkeleton) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetchNotifications(token, 12);
      const nextItems = response.data || [];
      itemsRef.current = nextItems;
      setItems(nextItems);
      setReadIds((current) => {
        const next = { ...current };
        nextItems.forEach((item) => {
          if (!item.isUnread) {
            next[item.id] = true;
          }
        });
        return next;
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load notifications');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else if (showSkeleton) {
        setLoading(false);
      }
      setHasLoaded(true);
    }
  }, [hasLoaded, token]);

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return undefined;
      }
      loadNotifications();
      return undefined;
    }, [loadNotifications, token]),
  );

  const isUnread = useCallback(
    (item: NotificationItem) => item.isUnread && !readIds[item.id],
    [readIds],
  );

  const unreadCount = useMemo(
    () => items.filter(isUnread).length,
    [isUnread, items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedFilter === 'UNREAD' && !isUnread(item)) return false;
      if (selectedFilter === 'ORDERS' && item.category !== 'ORDER') return false;
      if (selectedFilter === 'UPDATES' && item.category !== 'UPDATE') return false;
      return true;
    });
  }, [isUnread, items, selectedFilter]);

  const todayItems = useMemo(
    () => filteredItems.filter((item) => isToday(item.createdAt)),
    [filteredItems],
  );
  const earlierItems = useMemo(
    () => filteredItems.filter((item) => !isToday(item.createdAt)),
    [filteredItems],
  );

  const skeletonCount = useMemo(() => {
    const visibleCount = refreshing
      ? Math.max(filteredItems.length, Math.min(items.length, 6))
      : filteredItems.length;
    return Math.min(Math.max(visibleCount || 5, 4), 6);
  }, [filteredItems.length, items.length, refreshing]);

  const showSkeletonList = ((!hasLoaded || loading) && items.length === 0) || refreshing;
  const showInlineError = !showSkeletonList && items.length > 0 && Boolean(error);
  const showEmptyAll = !showSkeletonList && items.length === 0;
  const showFilteredEmpty = !showSkeletonList && !error && items.length > 0 && filteredItems.length === 0;

  const markAsRead = useCallback((id: string) => {
    setReadIds((current) => {
      if (current[id]) return current;
      return { ...current, [id]: true };
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((current) => {
      const next = { ...current };
      items.forEach((item) => {
        next[item.id] = true;
      });
      return next;
    });
  }, [items]);

  const renderSection = (title: string, sectionItems: NotificationItem[]) => {
    if (!sectionItems.length) return null;

    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>{title}</Text>

        <View style={styles.stackCard}>
          {sectionItems.map((item, index) => {
            const tone = TONE_STYLES[item.tone];
            const unread = isUnread(item);

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                style={[styles.noticeRow, unread ? styles.noticeRowUnread : null]}
                onPress={() => markAsRead(item.id)}
              >
                <View style={[styles.noticeIconWrap, { backgroundColor: tone.iconBg }]}>
                  <Ionicons name={resolveIconName(item.icon)} size={19} color={tone.iconColor} />
                </View>

                <View style={styles.noticeBody}>
                  <View style={styles.noticeTopLine}>
                    <Text style={styles.noticeTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.noticeTime}>{buildRelativeTime(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.noticeText}>{item.body}</Text>

                  <View style={styles.noticeMetaRow}>
                    <View style={styles.noticeCategoryChip}>
                      <Text style={styles.noticeCategoryText}>{CATEGORY_LABELS[item.category]}</Text>
                    </View>
                    {unread ? (
                      <View style={styles.unreadMeta}>
                        <View style={[styles.unreadDot, { backgroundColor: tone.dotColor }]} />
                        <Text style={styles.unreadLabel}>Unread</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {index < sectionItems.length - 1 ? <View style={styles.noticeDivider} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSkeletonSection = (sectionKey: string, rowCount: number, labelWidth: number) => (
    <View style={styles.sectionBlock}>
      <Animated.View style={[styles.skeletonSectionLabel, { opacity: skeletonPulse, width: labelWidth }]} />

      <View style={styles.stackCard}>
        {Array.from({ length: rowCount }, (_, index) => (
          <Animated.View key={`${sectionKey}-${index}`} style={[styles.noticeRow, { opacity: skeletonPulse }]}>
            <View style={styles.skeletonIconWrap}>
              <View style={styles.skeletonIconInner} />
            </View>

            <View style={styles.noticeBody}>
              <View style={styles.noticeTopLine}>
                <View style={[styles.skeletonLine, styles.skeletonTitleLine]} />
                <View style={[styles.skeletonLine, styles.skeletonTimeLine]} />
              </View>
              <View style={[styles.skeletonLine, styles.skeletonBodyLine]} />
              <View style={[styles.skeletonLine, styles.skeletonBodyLineShort]} />

              <View style={styles.noticeMetaRow}>
                <View style={[styles.skeletonLine, styles.skeletonMetaChip]} />
                <View style={styles.unreadMeta}>
                  <View style={styles.skeletonUnreadDot} />
                  <View style={[styles.skeletonLine, styles.skeletonUnreadLabel]} />
                </View>
              </View>
            </View>

            {index < rowCount - 1 ? <View style={styles.noticeDivider} /> : null}
          </Animated.View>
        ))}
      </View>
    </View>
  );

  const primarySkeletonCount = Math.max(2, Math.ceil(skeletonCount * 0.6));
  const secondarySkeletonCount = Math.max(0, skeletonCount - primarySkeletonCount);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => loadNotifications({ refresh: true })}
            tintColor="#8a6b55"
            colors={['#8a6b55']}
          />
        }
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.88} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color="#2f2219" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.markButton, items.length === 0 ? styles.markButtonDisabled : null]}
            activeOpacity={0.88}
            onPress={markAllAsRead}
            disabled={items.length === 0}
          >
            <Text style={styles.markButtonText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroller}
        >
          {FILTERS.map((filter) => {
            const active = filter.key === selectedFilter;

            return (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.9}
                style={[styles.filterChip, active ? styles.filterChipActive : null]}
                onPress={() => setSelectedFilter(filter.key)}
              >
                <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {showInlineError ? (
          <View style={styles.inlineErrorCard}>
            <Ionicons name="alert-circle-outline" size={17} color="#9b5d4d" />
            <Text style={styles.inlineErrorText}>{error}</Text>
          </View>
        ) : null}

        {showSkeletonList ? (
          <>
            {renderSkeletonSection('today-skeleton', primarySkeletonCount, 50)}
            {secondarySkeletonCount > 0 ? renderSkeletonSection('earlier-skeleton', secondarySkeletonCount, 70) : null}
          </>
        ) : null}

        {showEmptyAll ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={24} color="#8f755d" />
            </View>
            <Text style={styles.emptyEyebrow}>Notification center</Text>
            <Text style={styles.emptyTitle}>No notifications received yet</Text>
            <Text style={styles.emptyText}>
              You haven&apos;t received any notifications yet. New order and branch updates will appear here.
            </Text>
          </View>
        ) : null}

        {showFilteredEmpty ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="funnel-outline" size={24} color="#8f755d" />
            </View>
            <Text style={styles.emptyEyebrow}>No matches</Text>
            <Text style={styles.emptyTitle}>Nothing in this filter</Text>
            <Text style={styles.emptyText}>
              Try another filter to view your recent notifications.
            </Text>
          </View>
        ) : null}

        {!showSkeletonList && filteredItems.length > 0 ? (
          <>
            {renderSection('Today', todayItems)}
            {renderSection('Earlier', earlierItems)}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 22,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(233,219,205,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markButton: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,250,244,0.85)',
    borderWidth: 1,
    borderColor: '#eadccd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markButtonDisabled: {
    opacity: 0.52,
  },
  markButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b5646',
  },
  filterScroller: {
    marginTop: 2,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    height: 35,
    borderRadius: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6ede4',
    borderWidth: 1,
    borderColor: '#ebdfd0',
  },
  filterChipActive: {
    backgroundColor: '#211812',
    borderColor: '#211812',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7f6d60',
  },
  filterChipTextActive: {
    color: '#fffaf5',
  },
  sectionBlock: {
    marginTop: 18,
  },
  skeletonSectionLabel: {
    width: 74,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#ecdecd',
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7f6a5b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  stackCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(255,252,248,0.86)',
    borderWidth: 1,
    borderColor: '#ede1d4',
    overflow: 'hidden',
  },
  noticeRow: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  noticeRowUnread: {
    backgroundColor: 'rgba(255,248,241,0.72)',
  },
  noticeIconWrap: {
    position: 'absolute',
    top: 16,
    left: 14,
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeBody: {
    paddingLeft: 56,
  },
  noticeTopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  noticeTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#2f2219',
  },
  noticeTime: {
    fontSize: 11,
    color: '#9b8879',
    paddingTop: 2,
  },
  noticeText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 20,
    color: '#7f6b5c',
  },
  noticeMetaRow: {
    marginTop: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  noticeCategoryChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f6ece2',
  },
  noticeCategoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b7767',
  },
  unreadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unreadLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#876e5a',
  },
  noticeDivider: {
    marginTop: 14,
    marginLeft: 56,
    height: 1,
    backgroundColor: '#eee3d7',
  },
  skeletonIconWrap: {
    position: 'absolute',
    top: 16,
    left: 14,
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#f1e5d8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonIconInner: {
    width: 18,
    height: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: '#ecdfcf',
  },
  skeletonTitleLine: {
    height: 13,
    width: '58%',
  },
  skeletonTimeLine: {
    height: 10,
    width: 44,
  },
  skeletonBodyLine: {
    marginTop: 6,
    height: 11,
    width: '90%',
  },
  skeletonBodyLineShort: {
    marginTop: 6,
    height: 11,
    width: '72%',
  },
  skeletonMetaChip: {
    height: 22,
    width: 88,
  },
  skeletonUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d9c4ad',
  },
  skeletonUnreadLabel: {
    width: 42,
    height: 10,
  },
  inlineErrorCard: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ecd3c8',
    backgroundColor: 'rgba(255,246,243,0.92)',
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#8f5d52',
  },
  emptyCard: {
    marginTop: 18,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: 'center',
    backgroundColor: 'rgba(255,252,248,0.84)',
    borderWidth: 1,
    borderColor: '#eee1d4',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 2,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    backgroundColor: '#f4e7d7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: '#9d8068',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2f2219',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#856f5f',
    lineHeight: 20,
  },
});

export default NotificationScreen;
