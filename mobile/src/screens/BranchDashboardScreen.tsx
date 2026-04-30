import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { fetchOrderSummary, fetchOrderTrends, fetchOrders } from '../api/orders';
import { fetchSpiffSummary } from '../api/spiff';
import { fetchDesigns } from '../api/designs';
import { uploadMyPhoto } from '../api/auth';
import { fetchBranchEmployees } from '../api/branchEmployees';
import type { BranchEmployee, Design, Order } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';

type ActivityItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  time: string;
  sortDate: Date;
};

type TrendingProduct = {
  id: string;
  title: string;
  subtitle: string;
  price: number;
  imageUrl: string | null;
};

type RepPerformanceRow = {
  id: string;
  name: string;
  initial: string;
  sales: number;
};

type BranchPerformanceRow = {
  id: string;
  branchName: string;
  revenue: number;
  orders: number;
  reps: number;
  trend: number;
};

type NotificationTone = 'alertGold' | 'alertRed' | 'neutral' | 'info' | 'promo';

type NotificationEntry = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  tone: NotificationTone;
};

const normalizeBaseDesignNo = (designNo?: string | null) => String(designNo || '').replace(/-V\d+$/i, '').trim().toLowerCase();

const FALLBACK_TRENDING_PRODUCTS: TrendingProduct[] = [
  { id: 'fallback-1', title: 'Oval Pave', subtitle: 'WG - Full-Lab', price: 3840, imageUrl: null },
  { id: 'fallback-2', title: 'Tennis Bracelet', subtitle: 'WG - Lab-2ct', price: 5200, imageUrl: null },
];

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
    case 'SHIPPED':
      return 'cube-outline';
    case 'APPROVED':
      return 'checkmark-circle-outline';
    case 'IN_PRODUCTION':
      return 'construct-outline';
    case 'COMPLETED':
      return 'bag-check-outline';
    case 'CANCELLED':
      return 'close-circle-outline';
    default:
      return 'receipt-outline';
  }
};

const BranchDashboardScreen = () => {
  const { token, user, signOut, refresh } = useAuth();
  const navigation = useNavigation<any>();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 20 });
  const profileBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [summary, setSummary] = useState<{
    activeOrders: number;
    salesToday: number;
    todayTrend: number;
    salesThisMonth: number;
    monthlyTrend: number;
    ordersToday: number;
    ordersThisMonth: number;
    branchRevenueTotal?: number;
    branchSalesRepCount?: number;
    pendingApprovalOrders?: number;
    pipeline?: {
      pending: number;
      approved: number;
      inProduction: number;
      shipped: number;
      completed: number;
      cancelled: number;
    };
  } | null>(null);

  const [pipeline, setPipeline] = useState({ pending: 0, approved: 0, production: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);
  const [spiffEarned, setSpiffEarned] = useState(0);
  const [repPerformance, setRepPerformance] = useState<RepPerformanceRow[]>([]);
  const [branchPerformance, setBranchPerformance] = useState<BranchPerformanceRow[]>([]);
  const [companyActiveReps, setCompanyActiveReps] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    const [summaryRes, trendsRes, ordersRes, designsRes, spiffRes, repsRes] = await Promise.allSettled([
      fetchOrderSummary(token),
      fetchOrderTrends(token),
      fetchOrders(token, 1, 100, 'ALL'),
      fetchDesigns(token, 1, 40),
      fetchSpiffSummary(token),
      user?.role === 'COMPANY_ADMIN' ? fetchBranchEmployees(token) : Promise.resolve([] as BranchEmployee[]),
    ]);

    if (summaryRes.status === 'fulfilled') {
      setSummary(summaryRes.value);
      if (summaryRes.value.pipeline) {
        setPipeline({
          pending: summaryRes.value.pipeline.pending || 0,
          approved: summaryRes.value.pipeline.approved || 0,
          production: summaryRes.value.pipeline.inProduction || 0,
        });
      }
    }

    let pendingCount = 0;
    let approvedCount = 0;
    let productionCount = 0;

    let orderRows: Order[] = [];
    if (ordersRes.status === 'fulfilled') {
      orderRows = ordersRes.value.data || [];
      if (summaryRes.status !== 'fulfilled' || !summaryRes.value.pipeline) {
        orderRows.forEach((o) => {
          if (o.status === 'PENDING_APPROVAL' || o.status === 'QUOTE') pendingCount += 1;
          if (o.status === 'APPROVED') approvedCount += 1;
          if (o.status === 'IN_PRODUCTION') productionCount += 1;
        });
        setPipeline({ pending: pendingCount, approved: approvedCount, production: productionCount });
      }

      if (user?.role === 'BRANCH_MANAGER' || user?.role === 'COMPANY_ADMIN') {
        const repAgg = new Map<string, { name: string; sales: number }>();
        orderRows
          .filter((order) => order.isActive !== false)
          .forEach((order) => {
            const repId = String(order.salesRepId || '').trim();
            const repName =
              String(order.salesRepName || '').trim() ||
              String(order.salesRepEmail || '').trim() ||
              'Unknown Rep';
            const key = repId || repName.toLowerCase();
            const current = repAgg.get(key) || { name: repName, sales: 0 };
            current.sales += Number(order.price || 0);
            repAgg.set(key, current);
          });

        const ranked = Array.from(repAgg.entries())
          .map(([id, value]) => ({
            id,
            name: value.name,
            initial: value.name.charAt(0).toUpperCase() || 'R',
            sales: Number.isFinite(value.sales) ? value.sales : 0,
          }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 3);

        setRepPerformance(ranked);
      } else {
        setRepPerformance([]);
      }

      if (user?.role === 'COMPANY_ADMIN') {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
        const prevYear = prevMonthDate.getFullYear();
        const prevMonth = prevMonthDate.getMonth();

        const reps = repsRes.status === 'fulfilled' ? (repsRes.value || []) : [];
        setCompanyActiveReps(reps.filter((rep) => rep.isActive).length);

        const repsByBranchKey = new Map<string, number>();
        reps.forEach((rep) => {
          if (!rep.isActive) return;
          const key = String(rep.branch?.id || rep.branch?.name || '').trim().toLowerCase();
          if (!key) return;
          repsByBranchKey.set(key, (repsByBranchKey.get(key) || 0) + 1);
        });

        const branchAgg = new Map<
          string,
          { branchName: string; currentRevenue: number; previousRevenue: number; currentOrders: number; branchKey: string }
        >();

        orderRows
          .filter((order) => order.isActive !== false)
          .forEach((order) => {
            const branchName = String(order.branchName || 'Unknown Branch').trim() || 'Unknown Branch';
            const dynamicOrder = order as Order & { branchId?: string | null };
            const branchKey = String(dynamicOrder.branchId || branchName).trim().toLowerCase();
            if (!branchKey) return;

            const created = order.createdAt ? new Date(order.createdAt) : null;
            if (!created || Number.isNaN(created.getTime())) return;

            const bucket = branchAgg.get(branchKey) || {
              branchName,
              currentRevenue: 0,
              previousRevenue: 0,
              currentOrders: 0,
              branchKey,
            };

            const orderYear = created.getFullYear();
            const orderMonth = created.getMonth();
            const orderPrice = Number(order.price || 0);

            if (orderYear === currentYear && orderMonth === currentMonth) {
              bucket.currentRevenue += orderPrice;
              bucket.currentOrders += 1;
            } else if (orderYear === prevYear && orderMonth === prevMonth) {
              bucket.previousRevenue += orderPrice;
            }

            branchAgg.set(branchKey, bucket);
          });

        const calcTrend = (current: number, previous: number) => {
          if (previous <= 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100);
        };

        const performanceRows = Array.from(branchAgg.values())
          .filter((row) => row.currentRevenue > 0 || row.currentOrders > 0)
          .map((row) => ({
            id: row.branchKey,
            branchName: row.branchName,
            revenue: row.currentRevenue,
            orders: row.currentOrders,
            reps: repsByBranchKey.get(row.branchKey) || 0,
            trend: calcTrend(row.currentRevenue, row.previousRevenue),
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3);

        setBranchPerformance(performanceRows);
      } else {
        setBranchPerformance([]);
        setCompanyActiveReps(0);
      }
    } else {
      setRepPerformance([]);
      setBranchPerformance([]);
      setCompanyActiveReps(0);
    }

    if (trendsRes.status === 'fulfilled' && summaryRes.status !== 'fulfilled') {
      setSummary(trendsRes.value as any);
    }

    if (spiffRes.status === 'fulfilled') {
      const pointsPerDollar = Number(spiffRes.value?.config?.pointsPerDollar || 100);
      const totalEarnedPoints = Number(spiffRes.value?.wallet?.totalEarnedPoints || 0);
      const amount = pointsPerDollar > 0 ? totalEarnedPoints / pointsPerDollar : 0;
      setSpiffEarned(Number.isFinite(amount) ? amount : 0);
    } else {
      setSpiffEarned(0);
    }

    if (designsRes.status === 'fulfilled') {
      const allDesigns = designsRes.value.data || [];
      const uniqueDesigns: Design[] = [];
      const seenDesignKeys = new Set<string>();
      for (const design of allDesigns) {
        const key =
          normalizeBaseDesignNo(design.designNo) ||
          String(design.designName || '').trim().toLowerCase() ||
          design.id;
        if (!key || seenDesignKeys.has(key)) continue;
        seenDesignKeys.add(key);
        uniqueDesigns.push(design);
      }

      const shuffled = [...uniqueDesigns].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, 2).map((design: Design) => ({
        id: design.id,
        title: design.designName || design.designNo || 'Jewelry design',
        subtitle: `${design.jewelryGroup || 'Jewelry'} - ${design.collection || design.version || 'Catalog'}`,
        price: Number(design.displayPrice ?? design.totalValue ?? 0),
        imageUrl: design.imageUrls?.[0] || null,
      }));

      const result = [...chosen];
      const seenTitles = new Set(result.map((item) => item.title.toLowerCase().trim()));
      for (const fallback of FALLBACK_TRENDING_PRODUCTS) {
        if (result.length >= 2) break;
        const fallbackKey = fallback.title.toLowerCase().trim();
        if (seenTitles.has(fallbackKey)) continue;
        result.push(fallback);
        seenTitles.add(fallbackKey);
      }
      setTrendingProducts(result.slice(0, 2));
    }

    const items: ActivityItem[] = [];
    const activityRows =
      user?.role === 'BRANCH_MANAGER'
        ? orderRows.filter((order) => ['PENDING_APPROVAL', 'APPROVED', 'CANCELLED'].includes(String(order.status || '').toUpperCase()))
        : orderRows.filter((order) => (user?.id ? order.salesRepId === user.id : false));

    for (const order of activityRows.slice(0, 15)) {
      const date = order.createdAt ? new Date(order.createdAt) : new Date();
      const salesPerson = order.salesRepName || order.salesRepEmail || 'Sales rep';
      const managerName = order.branchManagerName || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Manager';
      const normalizedStatus = String(order.status || '').toUpperCase();

      let title = '';
      let subtitle = order.designNo || 'No design';

      if (user?.role === 'BRANCH_MANAGER') {
        if (normalizedStatus === 'PENDING_APPROVAL') {
          title = `Order #${order.orderNumber} came for approval`;
          subtitle = `From sales rep ${salesPerson}`;
        } else if (normalizedStatus === 'APPROVED') {
          title = `Order #${order.orderNumber} approved`;
          subtitle = `For sales rep ${salesPerson}`;
        } else if (normalizedStatus === 'CANCELLED') {
          title = `Order #${order.orderNumber} cancelled`;
          subtitle = `For sales rep ${salesPerson}`;
        } else {
          title = `Order #${order.orderNumber} updated`;
          subtitle = `${order.designNo || 'No design'} - ${salesPerson}`;
        }
      } else {
        if (normalizedStatus === 'PENDING_APPROVAL') {
          title = `Order #${order.orderNumber} sent for approval`;
          subtitle = `To manager ${managerName}`;
        } else if (normalizedStatus === 'APPROVED') {
          title = `Order #${order.orderNumber} approved`;
          subtitle = `By manager ${managerName}`;
        } else if (normalizedStatus === 'CANCELLED') {
          title = `Order #${order.orderNumber} cancelled`;
          subtitle = `By manager ${managerName}`;
        } else {
          title = `Order #${order.orderNumber} updated`;
          subtitle = order.designNo || 'No design';
        }
      }

      items.push({
        id: `order-${order.id}-${normalizedStatus}`,
        icon: statusIcon(order.status),
        title,
        subtitle,
        time: formatRelativeTime(date),
        sortDate: date,
      });
    }

    items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
    setActivity(items);
    setNotificationCount(items.length > 0 ? items.length : 0);
  }, [token, user?.id, user?.role, user?.firstName, user?.lastName]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const handleOpenNotifications = useCallback(() => {
    setNotificationsVisible(true);
    setNotificationCount(0);
  }, []);

  const handleChangePhoto = useCallback(async () => {
    if (!token) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to upload a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setUploadingPhoto(true);
      await uploadMyPhoto(token, {
        uri: asset.uri,
        name: asset.fileName || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      await refresh();
      setProfileMenuVisible(false);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploadingPhoto(false);
    }
  }, [token, refresh]);

  const repName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Sales Rep';
  const companyBranch = [user?.companyName, user?.branchName].filter(Boolean).join(' - ') || 'No branch assigned';
  const isBranchManager = user?.role === 'BRANCH_MANAGER';
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';
  const isManagerLike = isBranchManager || isCompanyAdmin;
  const companyMonthlyRevenue = Number(summary?.salesThisMonth || 0);
  const companyMonthlyOrders = Number(summary?.ordersThisMonth || 0);
  const companyAvgOrder = companyMonthlyOrders > 0 ? companyMonthlyRevenue / companyMonthlyOrders : 0;

  const formatMoney = (value: number | undefined) => {
    if (!value) return '$0';
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${Math.round(value)}`;
  };

  const formatMoneyCompact = (value: number | undefined) => {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return '$0';
    if (amount >= 1000) return `$${Math.round(amount / 1000)}k`;
    return `$${Math.round(amount)}`;
  };

  const formatWhole = (value: number | undefined) => {
    const amount = Number(value ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return '0';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount));
  };

  const formatTrend = (value: number | undefined) => {
    const numeric = Number(value ?? 0);
    const rounded = Number.isFinite(numeric) ? Math.round(numeric) : 0;
    return `${rounded >= 0 ? '+' : ''}${rounded}%`;
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number.isFinite(value) ? value : 0);

  const productsToShow = trendingProducts.length ? trendingProducts : FALLBACK_TRENDING_PRODUCTS;
  const activityEntries: NotificationEntry[] = activity.slice(0, 10).map((item) => {
    const text = `${item.title} ${item.subtitle}`.toLowerCase();
    const isApproval = text.includes('approval') || text.includes('approve');
    const isCritical = text.includes('cancelled') || text.includes('rejected') || text.includes('failed');
    const tone: NotificationTone = isCritical ? 'alertRed' : isApproval ? 'alertGold' : 'neutral';
    return {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      time: item.time,
      tone,
    };
  });

  const alerts = activityEntries.filter((entry) => entry.tone === 'alertGold' || entry.tone === 'alertRed').slice(0, 3);
  const recentActivity = activityEntries.filter((entry) => entry.tone === 'neutral').slice(0, 4);
  const updates: NotificationEntry[] = [
    {
      id: 'update-catalog-sync',
      title: 'Catalog sync completed',
      subtitle: 'Latest designs are available for browsing',
      time: 'Available now',
      tone: 'info',
    },
    {
      id: 'update-monthly-snapshot',
      title: `Monthly sales snapshot ${formatMoney(summary?.salesThisMonth)}`,
      subtitle: 'Performance summary refreshed for your branch',
      time: 'Today',
      tone: 'promo',
    },
  ];

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

  const hasAnyNotifications = alerts.length || recentActivity.length || updates.length;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoWrapRow}>
              <Ionicons name="flash-sharp" size={23} color="#C89D5A" style={styles.headBoltIcon} />
              <View style={styles.headTextGroup}>
                <Text style={styles.headBlitz}>BLITZ NYC</Text>
                <Text style={styles.headSub}>Built for closers</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.bellTile} onPress={handleOpenNotifications}>
              <Ionicons name="notifications-outline" size={20} color="#1E1E1E" />
              {notificationCount > 0 && (
                <View style={styles.redDot}>
                  <Text style={styles.redDotText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.greetingCard}>
            <TouchableOpacity
              ref={profileBtnRef}
              style={styles.profileAvatarTouch}
              onPress={() => {
                profileBtnRef.current?.measureInWindow((x, y, w, h) => {
                  const left = Math.max(16, Math.min(x + w - 200, 180));
                  setMenuPosition({ top: y + h + 6, left });
                  setProfileMenuVisible(true);
                });
              }}
            >
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={styles.profileAvatarImg} />
              ) : (
                <View style={styles.profileAvatarPlaceholder}>
                  <Ionicons name="person-outline" size={20} color="#7A746D" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.greetingTextBlock}>
              <Text style={styles.greetingSubText}>GOOD MORNING</Text>
              <Text style={styles.userNameText}>{repName}</Text>
              <Text style={styles.userBranchText}>{companyBranch}</Text>
            </View>
          </View>

          <View style={styles.statsHorizontal}>
            <View style={styles.statTile}>
              <Text
                style={[styles.statLabel, isCompanyAdmin ? styles.statLabelCompact : null]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {isCompanyAdmin ? 'COMPANY REV' : isBranchManager ? 'BRANCH REV.' : 'TODAY'}
              </Text>
              <Text style={styles.statNumber}>
                {isCompanyAdmin
                  ? formatMoneyCompact(companyMonthlyRevenue)
                  : isBranchManager
                    ? formatMoneyCompact(summary?.branchRevenueTotal)
                    : formatMoney(summary?.salesToday)}
              </Text>
              <Text style={styles.statSubTextGreen}>
                {isCompanyAdmin
                  ? `${formatTrend(summary?.monthlyTrend)} this month`
                  : isBranchManager
                    ? formatTrend(summary?.monthlyTrend)
                    : formatTrend(summary?.todayTrend)}
              </Text>
            </View>

            <View style={styles.statTile}>
              <Text style={styles.statLabel}>
                {isCompanyAdmin ? 'ORDERS' : isBranchManager ? 'MY REPS' : 'MONTHLY'}
              </Text>
              <Text style={styles.statNumber}>
                {isCompanyAdmin
                  ? formatWhole(companyMonthlyOrders)
                  : isBranchManager
                    ? formatWhole(summary?.branchSalesRepCount)
                    : formatMoney(summary?.salesThisMonth)}
              </Text>
              <Text style={styles.statSubTextGreen}>
                {isCompanyAdmin ? 'this month' : isBranchManager ? 'all active' : formatTrend(summary?.monthlyTrend)}
              </Text>
            </View>

            <View style={[styles.statTile, styles.statTileSpiff]}>
              <Text style={styles.statLabelSpiff}>
                {isCompanyAdmin ? 'AVG ORDER' : isBranchManager ? 'PENDING' : 'SPIFF'}
              </Text>
              <Text style={styles.statNumberSpiff}>
                {isCompanyAdmin
                  ? formatMoneyCompact(companyAvgOrder)
                  : isBranchManager
                    ? formatWhole(summary?.pendingApprovalOrders)
                    : formatMoney(spiffEarned)}
              </Text>
              <Text style={styles.statSubTextSpiff}>
                {isCompanyAdmin ? 'monthly avg' : isBranchManager ? 'needs review' : 'earned'}
              </Text>
            </View>
          </View>

          {isCompanyAdmin ? (
            <>
              <Text style={styles.sectionHeading}>Branch Performance</Text>
              <View style={styles.companyBranchPerformanceWrap}>
                {(branchPerformance.length ? branchPerformance : []).map((branch, index) => {
                  const maxRevenue = Math.max(...branchPerformance.map((row) => row.revenue), 1);
                  const ratio = Math.max(8, (branch.revenue / maxRevenue) * 100);
                  const trendUp = branch.trend >= 0;
                  return (
                    <View key={branch.id} style={styles.companyBranchCard}>
                      <View style={styles.companyBranchTopRow}>
                        <Text style={styles.companyBranchName} numberOfLines={1}>{branch.branchName}</Text>
                        <Text style={styles.companyBranchRevenue}>{formatMoneyCompact(branch.revenue)}</Text>
                      </View>
                      <View style={styles.companyBranchBarTrack}>
                        <View
                          style={[
                            styles.companyBranchBarFill,
                            index === 0
                              ? styles.companyBranchBarFillGreen
                              : index === 1
                                ? styles.companyBranchBarFillBlue
                                : styles.companyBranchBarFillSand,
                            { width: `${ratio}%` },
                          ]}
                        />
                      </View>
                      <View style={styles.companyBranchMetaRow}>
                        <Text style={styles.companyBranchMetaText}>
                          {formatWhole(branch.orders)} orders - {formatWhole(branch.reps)} reps
                        </Text>
                        <Text style={[styles.companyBranchTrend, trendUp ? styles.companyBranchTrendUp : styles.companyBranchTrendDown]}>
                          {trendUp ? '↑' : '↓'} {Math.abs(branch.trend)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {!branchPerformance.length ? (
                  <Text style={styles.repEmptyText}>No branch performance yet</Text>
                ) : null}
              </View>

              <View style={styles.companyAdminMiniStatsRow}>
                <View style={styles.companyAdminMiniTile}>
                  <Text style={styles.companyAdminMiniLabel}>PENDING APPROVAL</Text>
                  <Text style={styles.companyAdminMiniValue}>{formatWhole(summary?.pendingApprovalOrders)}</Text>
                  <Text style={styles.companyAdminMiniSub}>needs review</Text>
                </View>
                <View style={styles.companyAdminMiniTile}>
                  <Text style={styles.companyAdminMiniLabel}>ACTIVE REPS</Text>
                  <Text style={styles.companyAdminMiniValue}>{formatWhole(companyActiveReps)}</Text>
                  <Text style={[styles.companyAdminMiniSub, styles.companyAdminMiniSubGreen]}>all online</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionHeading}>Quick actions</Text>
              <View style={styles.quickRow}>
                <TouchableOpacity style={[styles.quickCard, styles.quickCardDark]} onPress={() => navigation.navigate('OrdersTab')}>
                  <Ionicons
                    name={isManagerLike ? 'time-outline' : 'checkbox-outline'}
                    size={20}
                    color="#FFFFFF"
                    style={styles.quickCardIcon}
                  />
                  <Text style={styles.quickCardTextWhite}>
                    {isManagerLike ? 'Pending Approvals' : 'My Orders'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickCard, styles.quickCardSpiff]}
                  onPress={() => navigation.navigate('SpiffRewards')}
                >
                  <Ionicons name="star-outline" size={20} color="#9C7A43" style={styles.quickCardIcon} />
                  <Text style={styles.quickCardTextDark}>Spiffs & Rewards</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickCard}
                  onPress={() => navigation.navigate('DesignsTab', { screen: 'CatalogCategories' })}
                >
                  <Ionicons name="search-outline" size={20} color="#6A635C" style={styles.quickCardIcon} />
                  <Text style={styles.quickCardTextDark}>Browse Catalog</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {isCompanyAdmin ? (
            <View style={styles.companyAdminActionsRow}>
              <TouchableOpacity
                style={styles.companyAdminActionCard}
                onPress={() => navigation.navigate('TeamTab', { screen: 'BranchesHome' })}
                activeOpacity={0.9}
              >
                <Ionicons name="business-outline" size={18} color="#7A746D" style={styles.companyAdminActionIcon} />
                <Text style={styles.companyAdminActionText}>Branches</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.companyAdminActionCard}
                onPress={() => navigation.navigate('TeamTab', { screen: 'TeamList' })}
                activeOpacity={0.9}
              >
                <Ionicons name="people-outline" size={18} color="#7A746D" style={styles.companyAdminActionIcon} />
                <Text style={styles.companyAdminActionText}>Team</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.companyAdminActionCard, styles.companyAdminActionCardHighlight]}
                onPress={() => navigation.navigate('PricingTab')}
                activeOpacity={0.9}
              >
                <Ionicons name="cash-outline" size={18} color="#A27A3D" style={styles.companyAdminActionIcon} />
                <Text style={[styles.companyAdminActionText, styles.companyAdminActionTextHighlight]}>Pricing</Text>
              </TouchableOpacity>
            </View>
          ) : isManagerLike ? (
            <View>
              <Text style={styles.repPerformanceHeading}>Rep Performance</Text>
              <View style={styles.repCardWrap}>
                {(repPerformance.length ? repPerformance : []).map((rep, index) => (
                  <View key={rep.id} style={styles.repRow}>
                    <View style={[styles.repAvatar, index === 0 ? styles.repAvatarMint : index === 1 ? styles.repAvatarSage : styles.repAvatarRose]}>
                      <Text style={[styles.repAvatarText, index === 2 ? styles.repAvatarTextRose : null]}>{rep.initial}</Text>
                    </View>
                    <Text style={styles.repName} numberOfLines={1}>
                      {rep.name}
                    </Text>
                    <Text style={styles.repSales}>{formatMoneyCompact(rep.sales)}</Text>
                  </View>
                ))}
                {!repPerformance.length ? (
                  <Text style={styles.repEmptyText}>No rep sales yet</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <>
              <View style={styles.pipelineHeaderSpread}>
                <Text style={styles.sectionHeading}>Sales pipeline</Text>
                <TouchableOpacity onPress={() => navigation.navigate('OrdersTab')}>
                  <Text style={styles.liveViewLink}>See all -&gt;</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.pipelinePlate}>
                <View style={styles.pipelineItem}>
                  <View style={styles.pipelineFlexText}>
                    <Text style={styles.pipeStateText}>Pending approval</Text>
                    <Text style={styles.pipeValueGold}>{pipeline.pending}</Text>
                  </View>
                  <View style={styles.pipeTrack}>
                    <View style={[styles.pipeFillGlowGold, { width: pipeline.pending ? '35%' : '2%' }]} />
                  </View>
                </View>

                <View style={styles.pipelineItem}>
                  <View style={styles.pipelineFlexText}>
                    <Text style={styles.pipeStateText}>Approved</Text>
                    <Text style={styles.pipeValueGreen}>{pipeline.approved}</Text>
                  </View>
                  <View style={styles.pipeTrack}>
                    <View style={[styles.pipeFillGlowGreen, { width: pipeline.approved ? '65%' : '2%' }]} />
                  </View>
                </View>

                <View style={styles.pipelineItem}>
                  <View style={styles.pipelineFlexText}>
                    <Text style={styles.pipeStateText}>In production</Text>
                    <Text style={styles.pipeValueBlue}>{pipeline.production}</Text>
                  </View>
                  <View style={styles.pipeTrack}>
                    <View style={[styles.pipeFillGlowBlue, { width: pipeline.production ? '45%' : '2%' }]} />
                  </View>
                </View>
              </View>

              <View style={styles.trendingHeaderRow}>
                <Text style={[styles.sectionHeading, styles.trendingSectionTitle]}>Trending today</Text>
                <TouchableOpacity onPress={() => navigation.navigate('DesignsTab', { screen: 'CatalogCategories' })}>
                  <Text style={styles.seeAllLink}>See all -</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.trendingRow}>
                {productsToShow.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.trendingCard}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('DesignsTab', { screen: 'CatalogCategories' })}
                  >
                    <View style={styles.trendingImageWrap}>
                      {item.imageUrl ? (
                        <Image source={{ uri: item.imageUrl }} style={styles.trendingImage} />
                      ) : (
                        <View style={styles.trendingImagePlaceholder}>
                          <Ionicons name="diamond-outline" size={24} color="#B59B7A" />
                        </View>
                      )}
                    </View>
                    <View style={styles.trendingBody}>
                      <Text style={styles.trendingTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.trendingMeta} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                      <Text style={styles.trendingPrice}>{formatPrice(item.price)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        <Modal
          visible={notificationsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNotificationsVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setNotificationsVisible(false)}>
            <View style={styles.modalOverlayLock}>
              <TouchableWithoutFeedback>
                <View style={styles.notificationsWindow}>
                  <View style={styles.notificationsHeaderRow}>
                    <Text style={styles.notificationsTitle}>Notifications</Text>
                    <TouchableOpacity onPress={() => setNotificationCount(0)}>
                      <Text style={styles.markReadText}>Mark all read</Text>
                    </TouchableOpacity>
                  </View>

                  {hasAnyNotifications ? (
                    <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                      {alerts.length ? (
                        <View style={styles.notificationSection}>
                          <Text style={styles.notificationSectionLabel}>ALERTS</Text>
                          {alerts.map((entry) => (
                            <TouchableOpacity
                              key={entry.id}
                              style={getNotificationCardStyle(entry.tone)}
                              onPress={() => {
                                setNotificationsVisible(false);
                                navigation.navigate('OrdersTab');
                              }}
                              activeOpacity={0.88}
                            >
                              <View style={styles.notificationCardTopRow}>
                                <View style={getNotificationDotStyle(entry.tone)} />
                                <Text style={styles.notificationCardTitle} numberOfLines={1}>
                                  {entry.title}
                                </Text>
                              </View>
                              <Text style={styles.notificationCardSubtitle}>{entry.subtitle}</Text>
                              <Text style={styles.notificationCardTime}>{entry.time}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      {recentActivity.length ? (
                        <View style={styles.notificationSection}>
                          <Text style={styles.notificationSectionLabel}>RECENT ACTIVITY</Text>
                          {recentActivity.map((entry) => (
                            <TouchableOpacity
                              key={entry.id}
                              style={getNotificationCardStyle(entry.tone)}
                              onPress={() => {
                                setNotificationsVisible(false);
                                navigation.navigate('OrdersTab');
                              }}
                              activeOpacity={0.88}
                            >
                              <View style={styles.notificationCardTopRow}>
                                <View style={getNotificationDotStyle(entry.tone)} />
                                <Text style={styles.notificationCardTitle} numberOfLines={1}>
                                  {entry.title}
                                </Text>
                              </View>
                              <Text style={styles.notificationCardSubtitle}>{entry.subtitle}</Text>
                              <Text style={styles.notificationCardTime}>{entry.time}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      <View style={styles.notificationSection}>
                        <Text style={styles.notificationSectionLabel}>UPDATES</Text>
                        {updates.map((entry) => (
                          <TouchableOpacity
                            key={entry.id}
                            style={getNotificationCardStyle(entry.tone)}
                            onPress={() => {
                              setNotificationsVisible(false);
                              navigation.navigate('DesignsTab', { screen: 'CatalogCategories' });
                            }}
                            activeOpacity={0.88}
                          >
                            <View style={styles.notificationCardTopRow}>
                              <View style={getNotificationDotStyle(entry.tone)} />
                              <Text style={styles.notificationCardTitle} numberOfLines={1}>
                                {entry.title}
                              </Text>
                            </View>
                            <Text style={styles.notificationCardSubtitle}>{entry.subtitle}</Text>
                            <Text style={styles.notificationCardTime}>{entry.time}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyNotifBox}>
                      <Text style={styles.emptyNotifString}>No recent activity</Text>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={profileMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setProfileMenuVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setProfileMenuVisible(false)}>
            <View style={styles.modalOverlayLock}>
              <TouchableWithoutFeedback>
                <View style={[styles.menuPopoutWindow, { top: menuPosition.top, left: menuPosition.left }]}>
                  <View style={styles.menuPopInnerData}>
                    <TouchableOpacity style={styles.menuHitRow} onPress={handleChangePhoto} disabled={uploadingPhoto}>
                      <Text style={styles.menuHitText}>{uploadingPhoto ? 'Uploading...' : 'Update Photo'}</Text>
                      <Ionicons name="image-outline" size={16} color="#4B433C" />
                    </TouchableOpacity>
                    <View style={styles.menuDividerH} />
                    <TouchableOpacity
                      style={styles.menuHitRow}
                      onPress={() => {
                        setProfileMenuVisible(false);
                        signOut();
                      }}
                    >
                      <Text style={[styles.menuHitText, { color: '#DE4A4A' }]}>Logout</Text>
                      <Ionicons name="log-out-outline" size={16} color="#DE4A4A" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 8 : 6,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 6 : 4,
    marginBottom: 14,
  },
  logoWrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headBoltIcon: {
    marginRight: 9,
    marginTop: -2,
  },
  headTextGroup: {
    justifyContent: 'center',
  },
  headBlitz: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1E1E',
    letterSpacing: 2.4,
  },
  headSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#B18441',
    fontStyle: 'italic',
    marginTop: 1,
  },
  bellTile: {
    width: 40,
    height: 40,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#DE5858',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  redDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  greetingTextBlock: {
    height: 54,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  profileAvatarTouch: {
    marginRight: 12,
  },
  profileAvatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#E3DBD1',
  },
  profileAvatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#DDD6CE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingSubText: {
    fontSize: 9,
    lineHeight: 10,
    fontWeight: '700',
    color: '#A6844D',
    letterSpacing: 1.2,
    marginBottom: 0,
  },
  userNameText: {
    fontSize: 22,
    color: '#1C1C1C',
    fontWeight: '800',
    lineHeight: 24,
    marginBottom: 0,
  },
  userBranchText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '500',
    color: '#847D75',
  },
  statsHorizontal: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 14,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    minHeight: 78,
    paddingVertical: 8,
    paddingHorizontal: 9,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  statTileSpiff: {
    backgroundColor: '#F9F4EB',
    borderColor: '#FFFFFF',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E877F',
    letterSpacing: 0.9,
  },
  statLabelCompact: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  statLabelSpiff: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A27A3D',
    letterSpacing: 0.9,
  },
  statNumber: {
    fontSize: 20,
    color: '#171717',
    fontWeight: '800',
    lineHeight: 22,
  },
  statNumberSpiff: {
    fontSize: 20,
    color: '#8C6A33',
    fontWeight: '800',
    lineHeight: 22,
  },
  statSubTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3F8D5D',
  },
  statSubTextSpiff: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A27A3D',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  companyAdminActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  companyAdminActionCard: {
    flex: 1,
    height: 74,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  companyAdminActionCardHighlight: {
    backgroundColor: '#F9F4EB',
    borderColor: '#E7D8C4',
  },
  companyAdminActionIcon: {
    marginBottom: 5,
  },
  companyAdminActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4A433D',
  },
  companyAdminActionTextHighlight: {
    color: '#9D773A',
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  quickCardDark: {
    backgroundColor: '#171717',
    borderColor: '#FFFFFF',
  },
  quickCardSpiff: {
    backgroundColor: '#F9F4EB',
    borderColor: '#FFFFFF',
  },
  quickCardIcon: {
    marginBottom: 5,
  },
  quickCardTextWhite: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickCardTextDark: {
    color: '#4A433D',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  repCardWrap: {
    backgroundColor: '#FBFBFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECE9E4',
  },
  repAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  repAvatarMint: {
    backgroundColor: '#E6F2EA',
  },
  repAvatarSage: {
    backgroundColor: '#EAF4EE',
  },
  repAvatarRose: {
    backgroundColor: '#F7E9E9',
  },
  repAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4D7D61',
  },
  repAvatarTextRose: {
    color: '#B26D6D',
  },
  repName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2520',
  },
  repSales: {
    fontSize: 20,
    fontWeight: '700',
    color: '#A27A3D',
    lineHeight: 22,
  },
  repPerformanceHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  repEmptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E877F',
    textAlign: 'center',
    paddingVertical: 16,
  },
  companyBranchPerformanceWrap: {
    gap: 10,
    marginBottom: 12,
  },
  companyBranchCard: {
    backgroundColor: '#FBFBFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  companyBranchTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  companyBranchName: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '700',
    color: '#24201A',
  },
  companyBranchRevenue: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    color: '#A57A34',
  },
  companyBranchBarTrack: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#E9E2D9',
    overflow: 'hidden',
  },
  companyBranchBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  companyBranchBarFillGreen: {
    backgroundColor: '#2E8B57',
  },
  companyBranchBarFillBlue: {
    backgroundColor: '#3A589A',
  },
  companyBranchBarFillSand: {
    backgroundColor: '#C8BCA8',
  },
  companyBranchMetaRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companyBranchMetaText: {
    fontSize: 11,
    lineHeight: 13,
    color: '#8A837A',
    fontWeight: '500',
  },
  companyBranchTrend: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '700',
  },
  companyBranchTrendUp: {
    color: '#3A8B59',
  },
  companyBranchTrendDown: {
    color: '#1F1D1A',
  },
  companyAdminMiniStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  companyAdminMiniTile: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  companyAdminMiniLabel: {
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: 0.7,
    color: '#8E877F',
    fontWeight: '700',
  },
  companyAdminMiniValue: {
    marginTop: 8,
    fontSize: 41,
    lineHeight: 43,
    fontWeight: '800',
    color: '#171717',
  },
  companyAdminMiniSub: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 13,
    fontWeight: '600',
    color: '#837B73',
  },
  companyAdminMiniSubGreen: {
    color: '#3F8D5D',
  },
  pipelineHeaderSpread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveViewLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B2874A',
  },
  trendingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  trendingSectionTitle: {
    marginBottom: 0,
  },
  seeAllLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B2874A',
    fontStyle: 'italic',
  },
  trendingRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  trendingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  trendingImageWrap: {
    height: 88,
    backgroundColor: '#F1EFEB',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendingBody: {
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
  },
  trendingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#27241F',
  },
  trendingMeta: {
    fontSize: 10,
    color: '#8B837A',
    marginTop: 1,
  },
  trendingPrice: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
    color: '#B2874A',
    marginTop: 2,
  },
  pipelinePlate: {
    width: '100%',
    backgroundColor: '#FBFBFB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    gap: 12,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pipelineItem: {
    width: '100%',
  },
  pipelineFlexText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pipeStateText: {
    fontSize: 12,
    color: '#453E38',
    fontWeight: '600',
  },
  pipeValueGold: {
    fontSize: 12,
    color: '#BA9252',
    fontWeight: '700',
  },
  pipeValueGreen: {
    fontSize: 12,
    color: '#4C8560',
    fontWeight: '700',
  },
  pipeValueBlue: {
    fontSize: 12,
    color: '#4768AB',
    fontWeight: '700',
  },
  pipeTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#EBE4DC',
    borderRadius: 3,
  },
  pipeFillGlowGold: {
    height: '100%',
    backgroundColor: '#C59A44',
    borderRadius: 3,
  },
  pipeFillGlowGreen: {
    height: '100%',
    backgroundColor: '#528E67',
    borderRadius: 3,
  },
  pipeFillGlowBlue: {
    height: '100%',
    backgroundColor: '#5075BA',
    borderRadius: 3,
  },
  modalOverlayLock: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  notificationsWindow: {
    position: 'absolute',
    top: 80,
    right: 10,
    width: 338,
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
  notificationsTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F1C18',
  },
  notificationsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  markReadText: {
    fontSize: 11,
    color: '#B2874A',
    fontWeight: '700',
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
    marginBottom: 8,
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
  notificationCardTitle: {
    flex: 1,
    fontSize: 11,
    color: '#2D2823',
    fontWeight: '700',
  },
  notificationCardSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: '#6C645B',
  },
  notificationCardTime: {
    fontSize: 11,
    color: '#8E867D',
    marginTop: 2,
  },
  emptyNotifBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyNotifString: {
    fontSize: 13,
    color: '#9E968D',
  },
  menuPopoutWindow: {
    position: 'absolute',
    width: 200,
  },
  menuPopInnerData: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  menuHitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuHitText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B433C',
  },
  menuDividerH: {
    height: 1,
    backgroundColor: '#EFEDE9',
  },
});

export default BranchDashboardScreen;
