import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { fetchOrders } from '../api/orders';
import type { Order } from '../types';
import type { OrdersStackParamList } from '../navigation/RootNavigator';

type FilterKey = 'ALL' | 'QUOTE' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PRODUCTION' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'QUOTE', label: 'Quote' },
  { key: 'PENDING_APPROVAL', label: 'In Review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'IN_PRODUCTION', label: 'In Production' },
  { key: 'SHIPPED', label: 'Ready to Ship' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
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
    backgroundColor: '#F3E8D6',
    textColor: '#8E6840',
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
  { background: '#F6EFE9', accent: '#A67F3F' },
  { background: '#F5EBE1', accent: '#cc8c57' },
  { background: '#FBF9F6', accent: '#c88373' },
  { background: '#FAF5ED', accent: '#b7a08a' },
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

const formatOrderHeading = (orderNumber: string) => orderNumber;

const OrdersScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('ALL');
  const [filterVisible, setFilterVisible] = useState(false);

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
        [order.orderNumber, order.designNo, order.companyName, order.branchName, order.customerName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesFilter =
        selectedFilter === 'ALL' || order.status === selectedFilter;

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
        <Ionicons name="receipt-outline" size={26} color="#A67F3F" />
      </View>
      <Text style={styles.emptyTitle}>No orders found</Text>
      <Text style={styles.emptyText}>Try a different search or switch filters to explore more logs.</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#FCFAF8', '#F5EBE1', '#E8D5C4']} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.fixedHeader}>
        <Text style={styles.pageTitle}>Orders History</Text>

        <View style={styles.searchAndFilterRow}>
          <View style={styles.searchShell}>
            <Ionicons name="search-outline" size={18} color="#a79687" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search order #, customer..."
              placeholderTextColor="#A59D96"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#b2a294" />
              </TouchableOpacity>
            ) : null}
          </View>
          
          <TouchableOpacity 
            style={styles.filterIconBtn} 
            onPress={() => setFilterVisible(true)} 
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={20} color="#6A5F56" />
            {selectedFilter !== 'ALL' && <View style={styles.filterActiveDot} />}
          </TouchableOpacity>
        </View>

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

      <Modal visible={filterVisible} transparent animationType="fade" onRequestClose={() => setFilterVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setFilterVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filter Orders</Text>
                  <TouchableOpacity onPress={() => setFilterVisible(false)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
                    <Ionicons name="close" size={24} color="#2C1E16" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.filterSectionTitle}>Order Status</Text>
                <View style={styles.modalChipGrid}>
                  {FILTERS.map((filter) => {
                    const selected = filter.key === selectedFilter;
                    return (
                      <TouchableOpacity
                        key={filter.key}
                        activeOpacity={0.85}
                        onPress={() => setSelectedFilter(filter.key)}
                        style={[styles.modalChip, selected ? styles.modalChipActive : null]}
                      >
                        <Text style={[styles.modalChipText, selected ? styles.modalChipTextActive : null]}>
                          {filter.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={styles.modalResetBtn} 
                    onPress={() => setSelectedFilter('ALL')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.modalResetText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.modalApplyBtn} 
                    onPress={() => setFilterVisible(false)}
                    activeOpacity={0.88}
                  >
                    <LinearGradient colors={['#D8AB52', '#C6973F', '#A37728']} style={styles.modalApplyGradient}>
                      <Text style={styles.modalApplyText}>Show Results</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF5ED',
  },
  fixedHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 20,
    paddingBottom: 4,
    zIndex: 5,
  },
  pageTitle: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 16,
    marginTop: 24,
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchShell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 0 : 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2C1E16',
    height: 42,
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingVertical: 0,
    includeFontPadding: false,
    fontWeight: '500',
  },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FDFBF9',
    borderWidth: 1,
    borderColor: '#DCC8B2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  filterActiveDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C6973F',
    borderWidth: 1,
    borderColor: '#FDFBF9',
  },
  error: {
    marginTop: 12,
    color: '#b14b42',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 16,
    paddingBottom: Platform.OS === 'android' ? 20 : 12,
    flexGrow: 1,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDFBF9',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 0 : 1,
    marginBottom: 12,
  },
  thumbnailWrap: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E8DFD5',
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
    minHeight: 68,
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
    fontWeight: '700',
    color: '#2C1E16',
  },
  statusChip: {
    maxWidth: 108,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  designName: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#6A5F56',
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
    color: '#A0978C',
    fontWeight: '500',
  },
  orderPrice: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1E16',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FDFBF9',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 34,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    marginTop: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8DFD5',
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
    color: '#8E8276',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FAF5ED',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '700',
    color: '#2C1E16',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A0978C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  modalChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  modalChip: {
    backgroundColor: '#FDFBF9',
    borderWidth: 1,
    borderColor: '#DCC8B2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalChipActive: {
    backgroundColor: '#2C1E16',
    borderColor: '#2C1E16',
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6A5F56',
  },
  modalChipTextActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalResetBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    backgroundColor: '#FDFBF9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6A5F56',
  },
  modalApplyBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalApplyGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default OrdersScreen;
