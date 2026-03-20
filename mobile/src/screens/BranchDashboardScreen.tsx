import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { fetchOrderSummary, fetchOrderTrends, fetchOrders } from '../api/orders';
import { fetchDesigns } from '../api/designs';

const APP_VERSION = '1.0.0';

const BG = '#F5F0EB';
const DARK_CARD = '#1C1C1E';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1C1C1E';
const TEXT_MUTED = '#8A8A8E';
const GREEN = '#34C759';
const RED = '#FF3B30';
const ACCENT = '#E8DDD0';
const BORDER = '#E0D8CF';

type ActivityItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  time: string;
  sortDate: Date;
};

const formatRelativeTime = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString();
};

const statusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
  switch (status) {
    case 'SHIPPED': return 'cube-outline';
    case 'APPROVED': return 'checkmark-circle-outline';
    case 'IN_PRODUCTION': return 'construct-outline';
    case 'COMPLETED': return 'bag-check-outline';
    case 'CANCELLED': return 'close-circle-outline';
    default: return 'receipt-outline';
  }
};

const statusLabel = (status: string): string => {
  switch (status) {
    case 'SHIPPED': return 'shipped';
    case 'APPROVED': return 'approved by client';
    case 'IN_PRODUCTION': return 'in production';
    case 'COMPLETED': return 'completed';
    case 'CANCELLED': return 'cancelled';
    case 'PENDING_APPROVAL': return 'pending approval';
    default: return 'created';
  }
};

const BranchDashboardScreen = () => {
  const { token, user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const profileBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  const [summary, setSummary] = useState<{
    ordersReceivedToday: number;
    ordersDueToday: number;
    salesThisWeek: number;
    activeOrders: number;
  } | null>(null);

  const [weekChange, setWeekChange] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    const [summaryRes, trendsRes, ordersRes, designsRes] = await Promise.allSettled([
      fetchOrderSummary(token),
      fetchOrderTrends(token),
      fetchOrders(token, 1, 5, 'ALL'),
      fetchDesigns(token, 1, 3),
    ]);

    // Summary
    if (summaryRes.status === 'fulfilled') {
      setSummary(summaryRes.value);
    }

    // Week-over-week % change from trends (last 7 days vs prior 7 days)
    if (trendsRes.status === 'fulfilled') {
      const points = trendsRes.value.points ?? [];
      // points is last 7 days; use first 3 as "last week partial" vs last 4 as "this week partial"
      // Better: compare sum of all 7 days vs salesThisWeek from summary
      // We use the trends to get last week's total by summing the older half
      const half = Math.floor(points.length / 2);
      const lastWeekSales = points.slice(0, half).reduce((s: number, p: { sales: number }) => s + (p.sales ?? 0), 0);
      const thisWeekSales = points.slice(half).reduce((s: number, p: { sales: number }) => s + (p.sales ?? 0), 0);
      if (lastWeekSales > 0) {
        setWeekChange(((thisWeekSales - lastWeekSales) / lastWeekSales) * 100);
      } else if (thisWeekSales > 0) {
        setWeekChange(100);
      } else {
        setWeekChange(null);
      }
    }

    // Build activity from recent orders + designs
    const items: ActivityItem[] = [];

    if (ordersRes.status === 'fulfilled') {
      for (const order of ordersRes.value.data.slice(0, 5)) {
        const date = order.createdAt ? new Date(order.createdAt) : new Date();
        items.push({
          id: `order-${order.id}`,
          icon: statusIcon(order.status),
          title: `Order #${order.orderNumber} ${statusLabel(order.status)}`,
          subtitle: order.designNo || 'No design',
          time: formatRelativeTime(date),
          sortDate: date,
        });
      }
    }

    if (designsRes.status === 'fulfilled') {
      for (const design of designsRes.value.data.slice(0, 3)) {
        const date = new Date(); // designs don't expose createdAt in list
        items.push({
          id: `design-${design.id}`,
          icon: 'diamond-outline',
          title: 'New design created',
          subtitle: design.designNo || design.jewelryGroup || 'Design',
          time: formatRelativeTime(date),
          sortDate: date,
        });
      }
    }

    items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
    setActivity(items.slice(0, 5));
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const firstName = user?.firstName || 'there';

  const salesFormatted = (() => {
    if (!summary) return '$0';
    const v = Number(summary.salesThisWeek);
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  })();

  const changePositive = weekChange !== null && weekChange >= 0;
  const changeLabel = weekChange !== null
    ? `${changePositive ? '↑' : '↓'} ${Math.abs(weekChange).toFixed(0)}% vs last week`
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerHeadline} numberOfLines={1}>
              <Text style={styles.headerGreeting}>{greeting}, </Text>
              <Text style={styles.headerName}>{firstName}</Text>
            </Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={22} color={TEXT_DARK} />
            </TouchableOpacity>
            <TouchableOpacity
              ref={profileBtnRef}
              style={styles.iconBtn}
              onPress={() => {
                profileBtnRef.current?.measureInWindow((
                  _x: number,
                  y: number,
                  _w: number,
                  h: number,
                ) => {
                  setMenuPosition({ top: y + h + 6, right: 20 });
                  setProfileMenuVisible(true);
                });
              }}
            >
              <Ionicons name="person-circle-outline" size={24} color={TEXT_DARK} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Popup */}
        <Modal
          visible={profileMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setProfileMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setProfileMenuVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.profileMenu, { top: menuPosition.top, right: menuPosition.right }]}>

                  <View style={styles.menuBlock}>
                    <View style={styles.menuRow}>
                      <View style={styles.menuAvatar}>
                        <Text style={styles.menuAvatarText}>
                          {(user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')}
                        </Text>
                      </View>
                      <View style={styles.menuNameBlock}>
                        <Text style={styles.menuName}>
                          {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'}
                        </Text>
                        <Text style={styles.menuEmail}>{user?.email || ''}</Text>
                      </View>
                    </View>

                    <View style={styles.menuInnerDivider} />

                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => {
                        setProfileMenuVisible(false);
                        signOut();
                      }}
                    >
                      <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                        <Ionicons name="log-out-outline" size={16} color={RED} />
                      </View>
                      <Text style={[styles.menuRowText, { color: RED }]}>Logout</Text>
                      <Ionicons name="chevron-forward" size={14} color={RED} style={styles.menuChevron} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.versionInfoBlock}>
                    <View style={styles.versionInfoTop}>
                      <View style={styles.versionIconBox}>
                        <Ionicons name="information-circle-outline" size={16} color={TEXT_MUTED} />
                      </View>
                      <View style={styles.versionTextBlock}>
                        <Text style={styles.versionLabel}>App Version</Text>
                        <Text style={styles.versionHint}>Current installed build</Text>
                      </View>
                    </View>
                    <Text style={styles.versionValue}>{APP_VERSION}</Text>
                  </View>

                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Dark Sales Card */}
        <View style={styles.salesCard}>
          <Text style={styles.salesAmount}>{salesFormatted}</Text>
          <Text style={styles.salesLabel}>Sales This Week</Text>
          {changeLabel ? (
            <View style={[styles.salesBadge, { backgroundColor: changePositive ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)' }]}>
              <Ionicons
                name={changePositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={changePositive ? GREEN : RED}
              />
              <Text style={[styles.salesBadgeText, { color: changePositive ? GREEN : RED }]}>
                {' '}{changeLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Orders{'\n'}Today</Text>
            <Text style={styles.statValue}>{summary?.ordersReceivedToday ?? 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Due{'\n'}Today</Text>
            <Text style={styles.statValue}>{summary?.ordersDueToday ?? 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Active{'\n'}Orders</Text>
            <Text style={styles.statValue}>{summary?.activeOrders ?? 0}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDark]}
            onPress={() => navigation.navigate('OrdersTab')}
          >
            <Ionicons name="add" size={20} color={WHITE} />
            <Text style={[styles.actionBtnText, { color: WHITE }]}>New Order</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnLight]}
            onPress={() => navigation.navigate('DesignsTab')}
          >
            <Ionicons name="diamond-outline" size={20} color={TEXT_DARK} />
            <Text style={[styles.actionBtnText, { color: TEXT_DARK }]}>Browse Designs</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {activity.length > 0 ? (
          <View style={styles.activityCard}>
            {activity.map((item, index) => (
              <View key={item.id}>
                <View style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <Ionicons name={item.icon} size={18} color={TEXT_MUTED} />
                  </View>
                  <View style={styles.activityText}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.activityTime}>{item.time}</Text>
                </View>
                {index < activity.length - 1 ? <View style={styles.activityDivider} /> : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <Text style={styles.activitySubtitle}>No recent activity</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 18,
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  headerHeadline: {
    fontSize: 40,
    lineHeight: 40,
    color: TEXT_DARK,
  },
  headerGreeting: {
    fontSize: 18,
    fontWeight: '500',
    color: '#7E736A',
  },
  headerName: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
  },
  profileMenu: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderRadius: 16,
    minWidth: 230,
    gap: 0,
  },
  menuBlock: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
  },
  menuInnerDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginHorizontal: 14,
  },
  menuAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
    textTransform: 'uppercase',
  },
  menuNameBlock: {
    flex: 1,
  },
  menuName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_DARK,
  },
  menuEmail: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  menuIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowText: {
    flex: 1,
    fontSize: 14,
    color: TEXT_DARK,
    fontWeight: '500',
  },
  menuChevron: {
    marginLeft: 'auto',
  },
  versionInfoBlock: {
    backgroundColor: '#FEFCFA',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#EAE2D9',
  },
  versionInfoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  versionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F7F1EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionTextBlock: {
    flex: 1,
  },
  versionLabel: {
    fontSize: 11,
    color: '#A09183',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  versionHint: {
    fontSize: 12,
    color: '#B1A295',
    marginTop: 2,
  },
  versionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#76685D',
  },
  salesCard: {
    backgroundColor: DARK_CARD,
    borderRadius: 20,
    padding: 24,
    marginBottom: 14,
  },
  salesAmount: { fontSize: 38, fontWeight: '700', color: WHITE, marginBottom: 4 },
  salesLabel: { fontSize: 14, color: '#AEAEB2', marginBottom: 10 },
  salesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  salesBadgeText: { fontSize: 12, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statLabel: { fontSize: 11, color: TEXT_MUTED, lineHeight: 15, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '700', color: TEXT_DARK },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT_DARK, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    minHeight: 90,
  },
  actionBtnDark: { backgroundColor: DARK_CARD },
  actionBtnLight: { backgroundColor: ACCENT },
  actionBtnText: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  activityCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  activityDivider: {
    marginLeft: 50,
    marginRight: 4,
    height: 2,
    borderTopWidth: 1,
    borderTopColor: '#E3D8CC',
    borderBottomWidth: 1,
    borderBottomColor: '#FFF8F1',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityText: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  activitySubtitle: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  activityTime: { fontSize: 12, color: TEXT_MUTED },
});

export default BranchDashboardScreen;
