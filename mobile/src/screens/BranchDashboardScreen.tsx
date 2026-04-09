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
import { LinearGradient } from 'expo-linear-gradient';
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
    activeOrders: number;
    salesToday: number;
    todayTrend: number;
    salesThisMonth: number;
    monthlyTrend: number;
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
    <View style={styles.container}>
      <LinearGradient 
        colors={['#FCFAF8', '#F5EBE1', '#E8D5C4']} 
        style={StyleSheet.absoluteFillObject} 
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand & Notification Row */}
          <View style={styles.header}>
            <View style={styles.logoWrapRow}>
              <View style={styles.darkLogoBlock}>
                <Ionicons name="flash-sharp" size={20} color="#DDB153" />
              </View>
              <View style={styles.headTextGroup}>
                <Text style={styles.headBlitz}>BLITZ NYC</Text>
                <Text style={styles.headSub}>Built for closers</Text>
              </View>
            </View>

            <View style={styles.topRightControls}>
              <TouchableOpacity style={styles.bellTile} onPress={handleOpenNotifications}>
                <Ionicons name="notifications-outline" size={22} color="#352D26" />
                {notificationCount > 0 && (
                  <View style={styles.redDot}>
                    <Text style={styles.redDotText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                ref={profileBtnRef}
                style={[styles.bellTile, { marginLeft: 10 }]}
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
                  <Ionicons name="person-circle-outline" size={28} color="#A79F93" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* User Greeting block */}
          <View style={styles.greetingArea}>
            <Text style={styles.greetingSubText}>GOOD MORNING</Text>
            <Text style={styles.userNameText}>{repName}</Text>
            <Text style={styles.userBranchText}>{companyBranch}</Text>
          </View>

          {/* Core Stats Row (3 Columns) */}
          <View style={styles.statsHorizontal}>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>TODAY</Text>
              <Text style={styles.statNumber}>{formatMoney(summary?.salesToday)}</Text>
              <Text style={styles.statSubTextGreen}>
                {summary?.todayTrend && summary.todayTrend < 0 ? '↓' : '↑'} {Math.abs(summary?.todayTrend || 0)}%
              </Text> 
            </View>
            <View style={styles.statTile}>
              <Text style={styles.statLabel}>MONTHLY</Text>
              <Text style={styles.statNumber}>{formatMoney(summary?.salesThisMonth)}</Text>
              <Text style={styles.statSubTextGreen}>
                {summary?.monthlyTrend && summary.monthlyTrend < 0 ? '↓' : '↑'} {Math.abs(summary?.monthlyTrend || 0)}%
              </Text>
            </View>
            <View style={[styles.statTile, styles.statTileGold]}>
              <Text style={styles.statLabelGold}>ACTIVE ORDERS</Text>
              <Text style={styles.statNumberGold}>{summary?.activeOrders || '0'}</Text>
            </View>
          </View>

          {/* Quick Actions (2x2 Grid) */}
          <Text style={styles.sectionHeading}>Quick actions</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity 
              style={[styles.quickCard, styles.quickCardDark]}
              onPress={() => navigation.navigate('OrdersTab')}
            >
              <Ionicons name="documents-outline" size={32} color="#FFFFFF" style={{ marginBottom: 12 }} />
              <Text style={styles.quickCardTextWhite}>My{"\n"}Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickCard}
              onPress={() => navigation.navigate('DesignsTab')}
            >
              <Ionicons name="search-outline" size={32} color="#554B41" style={{ marginBottom: 12 }} />
              <Text style={styles.quickCardTextDark}>Browse{"\n"}Catalog</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickCard}>
              <View style={styles.iconWithDot}>
                <Ionicons name="qr-code-outline" size={32} color="#554B41" style={{ marginBottom: 12 }} />
              </View>
              <Text style={styles.quickCardTextDark}>Scan{"\n"}Ring</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color="#554B41" style={{ marginBottom: 12 }} />
              <Text style={styles.quickCardTextDark}>Message{"\n"}Support</Text>
            </TouchableOpacity>
          </View>

          {/* Sales Pipeline */}
          <View style={styles.pipelineHeaderSpread}>
            <Text style={styles.sectionHeading}>Sales pipeline</Text>
            <TouchableOpacity onPress={() => navigation.navigate('OrdersTab')}>
              <Text style={styles.liveViewLink}>Live view →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pipelinePlate}>
            
            <View style={styles.pipelineItem}>
              <View style={styles.pipelineFlexText}>
                <Text style={styles.pipeStateText}>Pending approval</Text>
                <Text style={styles.pipeValueGold}>{pipeline.pending} orders</Text>
              </View>
              <View style={styles.pipeTrack}>
                <View style={[styles.pipeFillGlowGold, { width: pipeline.pending ? '35%' : '2%' }]} />
              </View>
            </View>

            <View style={styles.pipelineItem}>
              <View style={styles.pipelineFlexText}>
                <Text style={styles.pipeStateText}>Approved</Text>
                <Text style={styles.pipeValueGreen}>{pipeline.approved} orders</Text>
              </View>
              <View style={styles.pipeTrack}>
                <View style={[styles.pipeFillGlowGreen, { width: pipeline.approved ? '65%' : '2%' }]} />
              </View>
            </View>

            <View style={styles.pipelineItem}>
              <View style={styles.pipelineFlexText}>
                <Text style={styles.pipeStateText}>In production</Text>
                <Text style={styles.pipeValueBlue}>{pipeline.production} orders</Text>
              </View>
              <View style={styles.pipeTrack}>
                <View style={[styles.pipeFillGlowBlue, { width: pipeline.production ? '45%' : '2%' }]} />
              </View>
            </View>

          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Notifications Modal Wrapper */}
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
                    <Text style={styles.notificationsTitle}>Notifications & Activity</Text>
                    {activity.length ? (
                      <ScrollView style={{maxHeight: 280}}>
                      {activity.slice(0, 10).map((item, index) => (
                        <View key={item.id}>
                          <TouchableOpacity
                            style={styles.notifRowTight}
                            onPress={() => {
                              setNotificationsVisible(false);
                              navigation.navigate('OrdersTab');
                            }}
                          >
                            <View style={styles.actIconBall}>
                              <Ionicons name={item.icon} size={15} color="#5B534B" />
                            </View>
                            <View style={styles.notifTextBlockFlex}>
                              <Text style={styles.notifTitleMain} numberOfLines={1}>
                                {item.title}
                              </Text>
                              <Text style={styles.notifSubMain} numberOfLines={1}>
                                {item.subtitle}
                              </Text>
                            </View>
                            <Text style={styles.timeTag}>{item.time}</Text>
                          </TouchableOpacity>
                          {index < Math.min(activity.length, 10) - 1 ? (
                            <View style={styles.lineDivNotification} />
                          ) : null}
                        </View>
                      ))}
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

          {/* Profile Auth Context Menu */}
          <Modal
            visible={profileMenuVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setProfileMenuVisible(false)}
          >
            <TouchableWithoutFeedback onPress={() => setProfileMenuVisible(false)}>
              <View style={styles.modalOverlayLock}>
                <TouchableWithoutFeedback>
                  <View style={[styles.menuPopoutWindow, { top: menuPosition.top, left: 24 }]}>
                    <View style={styles.menuPopInnerData}>
                      <TouchableOpacity
                        style={styles.menuHitRow}
                        onPress={handleChangePhoto}
                        disabled={uploadingPhoto}
                      >
                        <Text style={styles.menuHitText}>
                          {uploadingPhoto ? 'Uploading...' : 'Update Photo'}
                        </Text>
                        <Ionicons name="image-outline" size={16} color="#5B534B" />
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
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 34,
  },
  logoWrapRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkLogoBlock: {
    width: 42,
    height: 42,
    backgroundColor: '#1E1B18',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#1E1B18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  headTextGroup: {
    justifyContent: 'center',
  },
  headBlitz: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C2723',
    letterSpacing: 3,
  },
  headSub: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    color: '#BC9450',
    marginTop: 2,
  },
  topRightControls: {
    flexDirection: 'row',
  },
  bellTile: {
    width: 48,
    height: 48,
    backgroundColor: '#FAF5F0',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#9D856B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  redDot: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#DE5858',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#F8EFE4',
  },
  redDotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  greetingArea: {
    marginBottom: 24,
  },
  greetingSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BC9450',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  userNameText: {
    fontFamily: Platform.OS === 'ios' ? 'Hoefler Text' : 'serif',
    fontSize: 34,
    color: '#1C1917',
    fontWeight: '500',
    marginBottom: 6,
  },
  userBranchText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#908982',
  },
  headerAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  statsHorizontal: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 34,
  },
  statTile: {
    flex: 1,
    aspectRatio: 0.95,
    backgroundColor: '#FCFBFA',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#A19183',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  statTileGold: {
    backgroundColor: '#FAECD6',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A19B94',
    letterSpacing: 1,
    marginBottom: 10,
  },
  statLabelGold: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B08846',
    letterSpacing: 1,
    marginBottom: 10,
  },
  statNumber: {
    fontFamily: Platform.OS === 'ios' ? 'Hoefler Text' : 'serif',
    fontSize: 24,
    color: '#211D1A',
    fontWeight: '500',
    marginBottom: 8,
  },
  statNumberGold: {
    fontFamily: Platform.OS === 'ios' ? 'Hoefler Text' : 'serif',
    fontSize: 24,
    color: '#946C2B',
    fontWeight: '500',
    marginBottom: 8,
  },
  statSubTextGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B8860',
  },
  statSubTextGold: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A07A3E',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#201D1A',
    marginBottom: 16,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 36,
  },
  quickCard: {
    width: '47.5%',
    backgroundColor: '#FCFBFA',
    borderRadius: 22,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#A49789',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 8,
  },
  quickCardDark: {
    backgroundColor: '#26221E',
    borderWidth: 0,
    shadowColor: '#1A1816',
  },
  iconWithDot: {
    position: 'relative',
  },
  quickCardTextWhite: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  quickCardTextDark: {
    color: '#453E38',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  pipelineHeaderSpread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  liveViewLink: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#C39A57',
  },
  pipelinePlate: {
    width: '100%',
    backgroundColor: '#FAFAF9',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#ABA195',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
    elevation: 10,
    gap: 18,
  },
  pipelineItem: {
    width: '100%',
  },
  pipelineFlexText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pipeStateText: {
    fontSize: 13,
    color: '#453E38',
    fontWeight: '600',
  },
  pipeValueGold: {
    fontSize: 13,
    color: '#BA9252',
    fontWeight: '700',
  },
  pipeValueGreen: {
    fontSize: 13,
    color: '#4C8560',
    fontWeight: '700',
  },
  pipeValueBlue: {
    fontSize: 13,
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
  // Reused Modal Styles
  modalOverlayLock: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 22, 0.35)',
  },
  notificationsWindow: {
    position: 'absolute',
    top: 90,
    right: 20,
    width: 320,
    backgroundColor: '#FAFAF9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#1A1816',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 16,
  },
  notificationsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#26221E',
    marginBottom: 12,
  },
  notifRowTight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  actIconBall: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F0E9DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTextBlockFlex: {
    flex: 1,
  },
  notifTitleMain: {
    fontSize: 13,
    color: '#26221E',
    fontWeight: '600',
  },
  notifSubMain: {
    fontSize: 12,
    color: '#8E867D',
    marginTop: 2,
  },
  timeTag: {
    fontSize: 11,
    color: '#AFA8A0',
  },
  lineDivNotification: {
    height: 1,
    backgroundColor: '#EEE8E0',
    marginLeft: 46,
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
    backgroundColor: '#FAFAF9',
    borderRadius: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#1A1816',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  menuHitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
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
