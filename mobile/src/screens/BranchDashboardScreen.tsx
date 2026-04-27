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
import type { Design, Order } from '../types';
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

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    const [summaryRes, trendsRes, ordersRes, designsRes, spiffRes] = await Promise.allSettled([
      fetchOrderSummary(token),
      fetchOrderTrends(token),
      fetchOrders(token, 1, 100, 'ALL'),
      fetchDesigns(token, 1, 40),
      fetchSpiffSummary(token),
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
    }

    if (trendsRes.status === 'fulfilled' && summaryRes.status !== 'fulfilled') {
      setSummary(trendsRes.value as any);
    }

    if (spiffRes.status === 'fulfilled') {
      const pointsPerDollar = Number(spiffRes.value?.config?.pointsPerDollar || 100);
      const unlockedPoints = Number(spiffRes.value?.wallet?.unlockedPoints || 0);
      const amount = pointsPerDollar > 0 ? unlockedPoints / pointsPerDollar : 0;
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

  const formatMoney = (value: number | undefined) => {
    if (!value) return '$0';
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${Math.round(value)}`;
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
              <Text style={styles.statLabel}>TODAY</Text>
              <Text style={styles.statNumber}>{formatMoney(summary?.salesToday)}</Text>
              <Text style={styles.statSubTextGreen}>{formatTrend(summary?.todayTrend)}</Text>
            </View>

            <View style={styles.statTile}>
              <Text style={styles.statLabel}>MONTHLY</Text>
              <Text style={styles.statNumber}>{formatMoney(summary?.salesThisMonth)}</Text>
              <Text style={styles.statSubTextGreen}>{formatTrend(summary?.monthlyTrend)}</Text>
            </View>

            <View style={[styles.statTile, styles.statTileSpiff]}>
              <Text style={styles.statLabelSpiff}>SPIFF</Text>
              <Text style={styles.statNumberSpiff}>{formatMoney(spiffEarned)}</Text>
              <Text style={styles.statSubTextSpiff}>earned</Text>
            </View>
          </View>

          <Text style={styles.sectionHeading}>Quick actions</Text>
          <View style={styles.quickRow}>
            <TouchableOpacity style={[styles.quickCard, styles.quickCardDark]} onPress={() => navigation.navigate('OrdersTab')}>
              <Ionicons name="checkbox-outline" size={20} color="#FFFFFF" style={styles.quickCardIcon} />
              <Text style={styles.quickCardTextWhite}>My Orders</Text>
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
    borderColor: '#C89D5A',
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
