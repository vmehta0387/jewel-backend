import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import { fetchOrders } from '../api/orders';
import type { Order } from '../types';
import type { OrdersStackParamList } from '../navigation/RootNavigator';

type FilterKey = 'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'URGENT';
type SkeletonOrderItem = { id: string; skeleton: true };

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'URGENT', label: 'Urgent' },
];

const STATUS_META: Record<
  string,
  {
    label: string;
    backgroundColor: string;
    textColor: string;
  }
> = {
  QUOTE: {
    label: 'Quote',
    backgroundColor: '#efe5d6',
    textColor: '#8e6840',
  },
  PENDING_APPROVAL: {
    label: 'In Review',
    backgroundColor: '#ece9f9',
    textColor: '#5f5aa9',
  },
  APPROVED: {
    label: 'Approved',
    backgroundColor: '#ddeee1',
    textColor: '#2f7a4c',
  },
  IN_PRODUCTION: {
    label: 'In Production',
    backgroundColor: '#dff0fb',
    textColor: '#2b6f99',
  },
  SHIPPED: {
    label: 'Ready to Ship',
    backgroundColor: '#dcf1e4',
    textColor: '#2d885b',
  },
  COMPLETED: {
    label: 'Completed',
    backgroundColor: '#e3f4e7',
    textColor: '#31754d',
  },
  CANCELLED: {
    label: 'Cancelled',
    backgroundColor: '#f4dddd',
    textColor: '#9d4f4f',
  },
};

const THUMB_COLORS = [
  { background: '#f1e5da', accent: '#c79a76' },
  { background: '#f5e8dc', accent: '#cc8c57' },
  { background: '#f3e3da', accent: '#c88373' },
  { background: '#f0e6dd', accent: '#b7a08a' },
];

const formatMoney = (value: number | null | undefined) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatOrderDate = (value?: string | null) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No due date';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusMeta = (status?: string | null) =>
  STATUS_META[status || ''] || {
    label: status || 'Pending',
    backgroundColor: '#eee7dd',
    textColor: '#75675c',
  };

const isUrgentOrder = (order: Order) => {
  if (!order.deliveryDate) return false;
  if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return false;

  const deliveryDate = new Date(order.deliveryDate);
  if (Number.isNaN(deliveryDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deliveryDate.setHours(0, 0, 0, 0);

  const diff = Math.round((deliveryDate.getTime() - today.getTime()) / 86400000);
  return diff <= 2;
};

const formatOrderHeading = (orderNumber: string) =>
  orderNumber.toLowerCase().startsWith('order') ? orderNumber : `Order ${orderNumber}`;

const OrdersScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('ALL');
  const ordersRef = useRef<Order[]>([]);
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

  const loadOrders = useCallback(async (options?: { refresh?: boolean }) => {
    const isRefresh = options?.refresh === true;
    const showSkeleton = !hasLoaded && ordersRef.current.length === 0;

    if (!token) {
      setLoading(false);
      setRefreshing(false);
      setHasLoaded(true);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else if (showSkeleton) {
      setLoading(true);
    }

    setError(null);

    try {
      const fullAccess =
        user?.role === 'BRANCH_MANAGER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SALES_REP';
      const response = await fetchOrders(token, 1, 25, fullAccess ? 'ALL' : 'ACTIVE');
      const nextOrders = response.data || [];
      ordersRef.current = nextOrders;
      setOrders(nextOrders);
    } catch (err: any) {
      setError(err?.message || 'Unable to load orders');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else if (showSkeleton) {
        setLoading(false);
      }
      setHasLoaded(true);
    }
  }, [hasLoaded, token, user?.role]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        [order.orderNumber, order.designNo, order.companyName, order.branchName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesFilter =
        selectedFilter === 'ALL' ||
        (selectedFilter === 'COMPLETED' && order.status === 'COMPLETED') ||
        (selectedFilter === 'URGENT' && isUrgentOrder(order)) ||
        (selectedFilter === 'IN_PROGRESS' && !['COMPLETED', 'CANCELLED'].includes(order.status));

      return matchesSearch && matchesFilter;
    });
  }, [orders, search, selectedFilter]);

  const skeletonCount = useMemo(() => {
    const visibleCount = refreshing
      ? Math.max(filteredOrders.length, Math.min(orders.length, 6))
      : filteredOrders.length;
    return Math.min(Math.max(visibleCount || 5, 4), 6);
  }, [filteredOrders.length, orders.length, refreshing]);

  const skeletonItems = useMemo<SkeletonOrderItem[]>(
    () => Array.from({ length: skeletonCount }, (_, index) => ({ id: `skeleton-order-${index}`, skeleton: true })),
    [skeletonCount],
  );

  const showListSkeleton = ((!hasLoaded || loading) && orders.length === 0) || refreshing;
  const listData = showListSkeleton ? skeletonItems : filteredOrders;

  const renderOrder = ({ item, index }: { item: Order; index: number }) => {
    const statusMeta = getStatusMeta(item.status);
    const thumbPalette = THUMB_COLORS[index % THUMB_COLORS.length];

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      >
        <View style={styles.thumbnailWrap}>
          <View style={[styles.thumbnailPlaceholder, { backgroundColor: thumbPalette.background }]}>
            <Ionicons name="diamond-outline" size={28} color={thumbPalette.accent} />
          </View>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.topRow}>
            <Text style={styles.orderNumber} numberOfLines={1}>
              {formatOrderHeading(item.orderNumber)}
            </Text>
            <View style={[styles.statusChip, { backgroundColor: statusMeta.backgroundColor }]}>
              <Text style={[styles.statusChipText, { color: statusMeta.textColor }]} numberOfLines={1}>
                {statusMeta.label}
              </Text>
            </View>
          </View>

          <Text style={styles.designName} numberOfLines={1}>
            {item.designNo || 'Jewelry design'}
          </Text>

          <View style={styles.bottomRow}>
            <Text style={styles.orderMeta} numberOfLines={1}>
              Due {formatOrderDate(item.deliveryDate)}
            </Text>
            <Text style={styles.orderPrice}>{formatMoney(item.price)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="receipt-outline" size={26} color="#8d735d" />
      </View>
      <Text style={styles.emptyTitle}>No orders found</Text>
      <Text style={styles.emptyText}>Try a different search or switch filters to explore more orders.</Text>
    </View>
  );

  const renderSkeletonOrder = ({ index }: { index: number }) => (
    <Animated.View style={[styles.orderCard, styles.skeletonOrderCard, { opacity: skeletonPulse }]}>
      <View style={[styles.thumbnailWrap, styles.skeletonThumbWrap]}>
        <View style={styles.skeletonThumbInner} />
      </View>

      <View style={styles.orderBody}>
        <View style={styles.topRow}>
          <View style={[styles.skeletonLine, styles.skeletonTitleLine]} />
          <View style={[styles.skeletonLine, styles.skeletonStatusLine]} />
        </View>

        <View style={[styles.skeletonLine, styles.skeletonDesignLine, index % 2 === 0 ? styles.skeletonDesignLineWide : null]} />

        <View style={styles.bottomRow}>
          <View style={[styles.skeletonLine, styles.skeletonMetaLine]} />
          <View style={[styles.skeletonLine, styles.skeletonPriceLine, index % 2 === 0 ? styles.skeletonPriceLineWide : null]} />
        </View>
      </View>
    </Animated.View>
  );

  const renderListItem = ({ item, index }: { item: Order | SkeletonOrderItem; index: number }) =>
    'skeleton' in item ? renderSkeletonOrder({ index }) : renderOrder({ item, index });

  return (
    <Screen style={styles.screen}>
      <View style={styles.fixedHeader}>
        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={18} color="#a79687" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order #, design, customer..."
            placeholderTextColor="#a79687"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#b2a294" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((filter) => {
            const selected = filter.key === selectedFilter;

            return (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.9}
                onPress={() => setSelectedFilter(filter.key)}
                style={[styles.filterChip, selected ? styles.filterChipActive : null]}
              >
                <Text style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderListItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={showListSkeleton ? null : renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => loadOrders({ refresh: true })}
            tintColor="#8a6b55"
            colors={['#8a6b55']}
          />
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: 'transparent',
  },
  fixedHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#efe4d8',
    shadowColor: '#9c7f64',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2d221c',
    height: 40,
  },
  filterRow: {
    paddingTop: 14,
    gap: 8,
  },
  filterChip: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3ebe2',
    borderWidth: 1,
    borderColor: '#eadfce',
  },
  filterChipActive: {
    backgroundColor: '#211711',
    borderColor: '#211711',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7f6d60',
  },
  filterChipTextActive: {
    color: '#fff9f4',
  },
  error: {
    marginTop: 12,
    color: '#b14b42',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
    flexGrow: 1,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#efe3d6',
    shadowColor: '#513829',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 12,
  },
  skeletonOrderCard: {
    backgroundColor: '#ffffff',
  },
  thumbnailWrap: {
    width: 74,
    height: 74,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#f3e9de',
  },
  skeletonThumbWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonThumbInner: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBody: {
    flex: 1,
    minHeight: 74,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  orderNumber: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#2f2119',
  },
  statusChip: {
    maxWidth: 108,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  designName: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#7e6959',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  orderMeta: {
    flex: 1,
    fontSize: 11,
    color: '#998678',
  },
  orderPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2f2119',
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: '#eedfce',
  },
  skeletonTitleLine: {
    height: 13,
    width: '50%',
  },
  skeletonStatusLine: {
    height: 18,
    width: 78,
  },
  skeletonDesignLine: {
    height: 12,
    width: '62%',
    marginTop: 6,
  },
  skeletonDesignLineWide: {
    width: '72%',
  },
  skeletonMetaLine: {
    height: 10,
    width: '40%',
  },
  skeletonPriceLine: {
    height: 14,
    width: 62,
  },
  skeletonPriceLineWide: {
    width: 74,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#fbf7f2',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: '#ece2d7',
    marginTop: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#f2e7da',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2b2019',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8a786a',
    lineHeight: 20,
  },
});

export default OrdersScreen;
