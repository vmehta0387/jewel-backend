import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
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
    return '$0';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('ALL');

  const loadOrders = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const fullAccess =
        user?.role === 'BRANCH_MANAGER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SALES_REP';
      const response = await fetchOrders(token, 1, 25, fullAccess ? 'ALL' : 'ACTIVE');
      setOrders(response.data || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

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
          {item.designImageUrl ? (
            <Image source={{ uri: item.designImageUrl, cache: 'force-cache' }} style={styles.thumbnailImage} />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: thumbPalette.background }]}>
              <Ionicons name="diamond-outline" size={28} color={thumbPalette.accent} />
            </View>
          )}
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

  return (
    <Screen style={styles.screen}>
      <View style={styles.fixedHeader}>
        <Text style={styles.pageTitle}>Orders</Text>

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
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadOrders}
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
    paddingTop: Platform.OS === 'android' ? 10 : 18,
    paddingBottom: Platform.OS === 'android' ? 8 : 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    zIndex: 5,
  },
  pageTitle: {
    fontFamily: 'serif',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 14,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.16)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#8B7355',
    shadowColor: '#9c7f64',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: Platform.OS === 'android' ? 0 : 1,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2d221c',
    height: 40,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  filterRow: {
    paddingTop: Platform.OS === 'android' ? 10 : 14,
    gap: 8,
  },
  filterChip: {
    height: Platform.OS === 'android' ? 30 : 34,
    borderRadius: 12,
    paddingHorizontal: Platform.OS === 'android' ? 12 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.3)',
  },
  filterChipActive: {
    backgroundColor: '#2C1E16',
    borderColor: '#2C1E16',
  },
  filterChipText: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterChipTextActive: {
    color: 'rgba(255, 252, 245, 0.82)',
  },
  error: {
    marginTop: 12,
    color: '#b14b42',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 4 : 8,
    paddingBottom: Platform.OS === 'android' ? 20 : 12,
    flexGrow: 1,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.22)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.3,
    borderColor: '#7C6650',
    shadowColor: '#6E533D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 0 : 2,
    marginBottom: 12,
  },
  thumbnailWrap: {
    width: 74,
    height: 74,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
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
    fontFamily: 'serif',
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2C1E16',
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
    color: '#8E8E93',
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
    color: '#808080',
  },
  orderPrice: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1E16',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: '#8B7355',
    marginTop: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F2EAE1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    lineHeight: 20,
  },
});

export default OrdersScreen;
