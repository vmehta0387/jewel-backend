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
import { uploadMyPhoto } from '../api/auth';
import type { Order } from '../types';
import { SafeAreaView } from 'react-native-safe-area-context';

const APP_VERSION = '1.0.0';

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

const BranchDashboardScreen = () => {
  const { token, user, signOut, refresh } = useAuth();
  const navigation = useNavigation<any>();
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const profileBtnRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [summary, setSummary] = useState<{
    ordersReceivedToday: number;
    ordersDueToday: number;
    salesThisWeek: number;
    activeOrders: number;
  } | null>(null);

  const [pipeline, setPipeline] = useState({ pending: 0, approved: 0, production: 0 });
  
  // recent activity items (acting as notifications per user instruction)
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    const [summaryRes, trendsRes, ordersRes] = await Promise.allSettled([
      fetchOrderSummary(token),
      fetchOrderTrends(token),
      fetchOrders(token, 1, 100, 'ALL'),
    ]);

    if (summaryRes.status === 'fulfilled') {
      setSummary(summaryRes.value);
    }

    let pendingCount = 0;
    let approvedCount = 0;
    let productionCount = 0;

    let orderRows: Order[] = [];
    if (ordersRes.status === 'fulfilled') {
      orderRows = ordersRes.value.data || [];
      orderRows.forEach(o => {
          if (o.status === 'PENDING_APPROVAL') pendingCount++;
          if (o.status === 'APPROVED') approvedCount++;
          if (o.status === 'IN_PRODUCTION') productionCount++;
      });
      setPipeline({ pending: pendingCount, approved: approvedCount, production: productionCount });
    }

    // Build recent activity to display in notifications
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
          subtitle = `${order.designNo || 'No design'} • ${salesPerson}`;
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
  }, [token, user?.id, user?.role]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const handleOpenNotifications = useCallback(() => {
    setNotificationsVisible(true);
    setNotificationCount(0); // clear badge
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

  // DYNAMIC NAME AND BRANCH INFO (Strictly dynamic, no fallbacks to sarah)
  const repName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Sales Rep';
  const companyBranch = [user?.companyName, user?.branchName].filter(Boolean).join(' • ') || 'No branch assigned';

  // Format Helpers
  const formatMoney = (v: number | undefined) => {
    if (!v) return '$0';
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Block with Logo + Icons from old design */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.blackLogo}>
              <Ionicons name="flash" size={24} color="#CE9C36" />
            </View>
            <View style={styles.appTitleBlock}>
              <Text style={styles.appName}>BLITZ NYC</Text>
              <Text style={styles.appSubtitle}>Built for closers</Text>
            </View>
          </View>
          
          <View style={styles.headerIconsContainer}>
            {/* Notification Bell */}
            <TouchableOpacity style={styles.iconBtn} onPress={handleOpenNotifications}>
              <Ionicons name="notifications-outline" size={22} color="#1A1816" />
              {notificationCount > 0 ? (
                <View style={styles.redBadge}>
                  <Text style={styles.redBadgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            {/* Profile Avatar (From Current Design) */}
            <TouchableOpacity
              ref={profileBtnRef}
              style={styles.iconBtn}
              onPress={() => {
                profileBtnRef.current?.measureInWindow((x, y, w, h) => {
                  setMenuPosition({ top: y + h + 6, right: 20 });
                  setProfileMenuVisible(true);
                });
              }}
            >
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} style={styles.headerAvatarImg} />
              ) : (
                <Ionicons name="person-circle-outline" size={26} color="#1A1816" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Greeting Area */}
        <View style={styles.greetingArea}>
          <Text style={styles.greetingText}>GOOD MORNING</Text>
          <Text style={styles.userName}>{repName}</Text>
          <Text style={styles.userBranch}>{companyBranch}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>TODAY</Text>
            <Text style={styles.statValue}>{summary?.ordersReceivedToday || 0}</Text>
            <Text style={styles.statTrendUp}>orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statTitle}>MONTHLY</Text>
            <Text style={styles.statValue}>{formatMoney(summary?.salesThisWeek)}</Text>
            <Text style={styles.statTrendUp}>volume</Text>
          </View>
          <View style={[styles.statCard, styles.spiffCard]}>
            <Text style={styles.statTitleSpiff}>ACTIVE ORDERS</Text>
            <Text style={styles.statValueSpiff}>{summary?.activeOrders || 0}</Text>
            <Text style={styles.statEarnedSpiff}>current</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.quickActionsGrid}>
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionCard, styles.actionCardDark]}
              onPress={() => navigation.navigate('OrdersTab')}
            >
              <Ionicons name="clipboard-outline" size={28} color="#FFFFFF" style={styles.actionIcon} />
              <Text style={styles.actionTextDark}>My{"\n"}Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('DesignsTab')}
            >
              <Ionicons name="search-outline" size={28} color="#7E766D" style={styles.actionIcon} />
              <Text style={styles.actionText}>Browse{"\n"}Catalog</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="apps-outline" size={28} color="#7E766D" style={styles.actionIcon} />
              <Text style={styles.actionText}>Scan{"\n"}Ring</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="chatbubble-outline" size={28} color="#7E766D" style={styles.actionIcon} />
              <Text style={styles.actionText}>Message{"\n"}Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sales Pipeline */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Sales pipeline</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OrdersTab')}>
            <Text style={styles.liveViewText}>Live view →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pipelineCard}>
          <View style={styles.pipelineRow}>
            <View style={styles.pipelineTextRow}>
              <Text style={styles.pipelineLabel}>Pending approval</Text>
              <Text style={styles.pipelineValuePending}>{pipeline.pending} orders</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#C89B3A', width: pipeline.pending ? '40%' : '2%' }]} />
            </View>
          </View>

          <View style={styles.pipelineDivider} />

          <View style={styles.pipelineRow}>
            <View style={styles.pipelineTextRow}>
              <Text style={styles.pipelineLabel}>Approved</Text>
              <Text style={styles.pipelineValueApproved}>{pipeline.approved} orders</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#38734C', width: pipeline.approved ? '65%' : '2%' }]} />
            </View>
          </View>

          <View style={styles.pipelineDivider} />

          <View style={styles.pipelineRow}>
            <View style={styles.pipelineTextRow}>
              <Text style={styles.pipelineLabel}>In production</Text>
              <Text style={styles.pipelineValueProd}>{pipeline.production} orders</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { backgroundColor: '#2C4FA1', width: pipeline.production ? '50%' : '2%' }]} />
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Notifications Modal (Moved Activity Content Here) */}
      <Modal
          visible={notificationsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNotificationsVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setNotificationsVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.notificationsMenu}>
                  <Text style={styles.notificationsTitle}>Notifications & Activity</Text>
                  {activity.length ? (
                    <ScrollView style={{maxHeight: 280}}>
                    {activity.slice(0, 10).map((item, index) => (
                      <View key={item.id}>
                        <TouchableOpacity
                          style={styles.notificationRow}
                          onPress={() => {
                            setNotificationsVisible(false);
                            navigation.navigate('OrdersTab');
                          }}
                        >
                          <View style={styles.activityIcon}>
                            <Ionicons name={item.icon} size={15} color="#5B534B" />
                          </View>
                          <View style={styles.notificationTextWrap}>
                            <Text style={styles.notificationTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={styles.notificationSubtitle} numberOfLines={1}>
                              {item.subtitle}
                            </Text>
                          </View>
                          <Text style={styles.activityTime}>{item.time}</Text>
                        </TouchableOpacity>
                        {index < Math.min(activity.length, 10) - 1 ? (
                          <View style={styles.notificationDivider} />
                        ) : null}
                      </View>
                    ))}
                    </ScrollView>
                  ) : (
                    <View style={styles.notificationEmpty}>
                      <Text style={styles.notificationEmptyText}>No recent activity</Text>
                    </View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Profile Menu Popup (Retained logic from previous implementations) */}
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
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={handleChangePhoto}
                      disabled={uploadingPhoto}
                    >
                      <Text style={styles.menuRowText}>
                        {uploadingPhoto ? 'Uploading...' : 'Update Photo'}
                      </Text>
                      <Ionicons name="image-outline" size={16} color="#5B534B" />
                    </TouchableOpacity>
                    <View style={styles.menuInnerDivider} />
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => {
                        setProfileMenuVisible(false);
                        signOut();
                      }}
                    >
                      <Text style={[styles.menuRowText, { color: '#DE4A4A' }]}>Logout</Text>
                      <Ionicons name="log-out-outline" size={16} color="#DE4A4A" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E8' }, 
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 40, paddingTop: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blackLogo: {
    width: 44,
    height: 44,
    backgroundColor: '#1E1B18',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appTitleBlock: {
    justifyContent: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#1E1B18',
  },
  appSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B68832',
    fontStyle: 'italic',
    marginTop: 2,
  },
  headerIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DDD3',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#3A2E24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  headerAvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  redBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DE4A4A',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#F8F4EE',
  },
  redBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  greetingArea: {
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B68832',
    letterSpacing: 1,
    marginBottom: 4,
  },
  userName: {
    fontFamily: 'serif',
    fontSize: 32,
    color: '#1E1B18',
    fontWeight: '500',
    marginBottom: 4,
  },
  userBranch: {
    fontSize: 13,
    color: '#8E867D',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#3A2E24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  spiffCard: {
    backgroundColor: '#F8EEDC', 
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E867D',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statTitleSpiff: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A97C2B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: 'serif',
    fontSize: 20,
    color: '#1E1B18',
    fontWeight: '500',
    marginBottom: 6,
  },
  statValueSpiff: {
    fontFamily: 'serif',
    fontSize: 20,
    color: '#A97C2B',
    fontWeight: '500',
    marginBottom: 6,
  },
  statTrendUp: {
    fontSize: 10,
    fontWeight: '600',
    color: '#38734C',
  },
  statEarnedSpiff: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A97C2B',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B18',
    marginBottom: 14,
  },
  quickActionsGrid: {
    gap: 12,
    marginBottom: 32,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1, 
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1.1,
    shadowColor: '#3A2E24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  actionCardDark: {
    backgroundColor: '#1E1B18',
  },
  actionIcon: {
    marginBottom: 10,
  },
  actionTextDark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionText: {
    color: '#5B534B',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  liveViewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B68832',
    fontStyle: 'italic',
  },
  pipelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#3A2E24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  pipelineRow: {
    marginVertical: 4,
  },
  pipelineTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pipelineLabel: {
    fontSize: 12,
    color: '#5B534B',
    fontWeight: '500',
  },
  pipelineValuePending: {
    fontSize: 12,
    color: '#B68832',
    fontWeight: '700',
  },
  pipelineValueApproved: {
    fontSize: 12,
    color: '#38734C',
    fontWeight: '700',
  },
  pipelineValueProd: {
    fontSize: 12,
    color: '#2C4FA1',
    fontWeight: '700',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#EAE2D8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pipelineDivider: {
    height: 1,
    backgroundColor: '#F3EDE6',
    marginVertical: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 22, 0.2)',
  },
  notificationsMenu: {
    position: 'absolute',
    top: 78,
    right: 20,
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6DDD3',
    padding: 12,
    shadowColor: '#1E1B18',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 22,
    elevation: 12,
  },
  notificationsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1B18',
    marginBottom: 8,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F5F0E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTextWrap: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 12,
    color: '#1E1B18',
    fontWeight: '600',
  },
  notificationSubtitle: {
    fontSize: 11,
    color: '#8E867D',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 10,
    color: '#8E867D',
  },
  notificationDivider: {
    height: 1,
    backgroundColor: '#F5F0E8',
    marginLeft: 38,
  },
  notificationEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  notificationEmptyText: {
    fontSize: 12,
    color: '#8E867D',
  },
  profileMenu: {
    position: 'absolute',
    width: 180,
  },
  menuBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E6DDD3',
    shadowColor: '#1E1B18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuRowText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5B534B',
  },
  menuInnerDivider: {
    height: 1,
    backgroundColor: '#F5F0E8',
  },
});

export default BranchDashboardScreen;
