import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchOrderPeriodSummary, fetchOrders, type OrderPeriod, type OrderPeriodSummary } from '../api/orders';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types';
import type { OrdersStackParamList, QuoteSummaryPayload } from '../navigation/RootNavigator';

type PeriodRoute = RouteProp<OrdersStackParamList, 'OrderPeriodList'>;
type PeriodNav = NativeStackNavigationProp<OrdersStackParamList>;

const PERIODS: Array<{ key: OrderPeriod; label: string }> = [
  { key: 'TODAY', label: 'Today' },
  { key: 'WEEKLY', label: 'Weekly' },
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'ANNUALLY', label: 'Annually' },
];
const EMPTY_PERIOD_SUMMARY: OrderPeriodSummary = {
  today: { count: 0, totalAmount: 0 },
  weekly: { count: 0, totalAmount: 0 },
  monthly: { count: 0, totalAmount: 0 },
  annually: { count: 0, totalAmount: 0 },
};
const PERIOD_SUMMARY_KEYS: Record<OrderPeriod, keyof OrderPeriodSummary> = {
  TODAY: 'today',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ANNUALLY: 'annually',
};

const compact = (value?: string | null) => String(value || '').trim();
const money = (value?: number | null) => `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
const formatOrderDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const normalizeStatus = (value?: string | null) => {
  const status = compact(value).toUpperCase();
  if (status === 'IN_PRODUCTION' || status === 'PRODUCTION') return 'IN_PRODUCTION';
  if (status === 'COMPLETED') return 'COMPLETED';
  return status === 'APPROVED' ? 'APPROVED' : status;
};
const statusLabel = (value?: string | null) => {
  const status = normalizeStatus(value);
  if (status === 'IN_PRODUCTION') return 'In Prod.';
  return status ? status.charAt(0) + status.slice(1).toLowerCase() : 'Order';
};
const designName = (order: Order) => compact(order.designName || order.design?.designName);
const designNo = (order: Order) => compact(order.designNo || order.design?.designNo);

const parseSelection = (value?: string | null): QuoteSummaryPayload['selection'] => {
  const text = compact(value);
  if (!text) return {};
  return text.split('|').reduce<QuoteSummaryPayload['selection']>((acc, part) => {
    const [rawKey, ...rest] = part.split(':');
    const key = compact(rawKey).toLowerCase();
    const val = compact(rest.join(':'));
    if (!val) return acc;
    if (key.includes('metal')) acc.metalColor = val;
    else if (key.includes('coverage') || key.includes('style')) acc.style = val;
    else if (key.includes('weight')) acc.weight = val;
    else if (key.includes('quality')) acc.quality = val;
    else if (key.includes('ring size')) acc.ringSize = val;
    else if (key.includes('shape')) acc.shape = val;
    return acc;
  }, {});
};

const pillColors = (status?: string | null) => {
  const key = normalizeStatus(status);
  if (key === 'COMPLETED') return { bg: '#E8EFFC', border: '#BED1F1', text: '#3E6FA8' };
  if (key === 'IN_PRODUCTION') return { bg: '#EAF1FD', border: '#BFD2F1', text: '#3D6CAF' };
  return { bg: '#E7F2EA', border: '#BFD9C8', text: '#2C7B4D' };
};

const OrderPeriodListScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<PeriodNav>();
  const route = useRoute<PeriodRoute>();
  const [period, setPeriod] = useState<OrderPeriod>(route.params?.initialPeriod || 'TODAY');
  const lastOpenKeyRef = useRef<number | undefined>(route.params?.openKey);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [periodSummary, setPeriodSummary] = useState<OrderPeriodSummary>(EMPTY_PERIOD_SUMMARY);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shouldShowSalesRep = Boolean(user && user.role !== 'SALES_REP');

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [response, summaryResponse] = await Promise.all([
        fetchOrders(token, 1, 200, 'ALL', { period, statusGroup: 'FULFILLED' }),
        fetchOrderPeriodSummary(token),
      ]);
      setOrders(response.data || []);
      setTotalRecords(Number(response.total || 0));
      setPeriodSummary({ ...EMPTY_PERIOD_SUMMARY, ...summaryResponse });
    } catch (err: any) {
      setError(err?.message || 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  }, [period, token]);

  useEffect(() => {
    if (route.params?.openKey === lastOpenKeyRef.current) return;
    lastOpenKeyRef.current = route.params?.openKey;
    setPeriod(route.params?.initialPeriod || 'TODAY');
    setSearch('');
  }, [route.params?.initialPeriod, route.params?.openKey]);

  useFocusEffect(useCallback(() => void loadOrders(), [loadOrders]));

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      [
        order.orderNumber,
        designName(order),
        designNo(order),
        order.purchaseOrderNumber,
        order.customerName,
        order.customerEmail,
        order.shortDescription,
        order.salesRepName,
        order.salesRepEmail,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [orders, search]);

  const selectedSummary = periodSummary[PERIOD_SUMMARY_KEYS[period]] || EMPTY_PERIOD_SUMMARY.today;

  const openSummary = useCallback(
    (order: Order) => {
      const summary: QuoteSummaryPayload = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        shortDescription: order.shortDescription || undefined,
        designId: order.designId || '',
        designNo: designNo(order) || order.orderNumber,
        designName: designName(order) || null,
        imageUrl: order.designImageUrl || null,
        price: Number(order.price || 0),
        selectedOptions: order.selectedOptions || null,
        selection: parseSelection(order.shortDescription),
        customerName: order.customerName || undefined,
        customerPhone: order.customerPhone || undefined,
        customerEmail: order.customerEmail || undefined,
        salesRepName: order.salesRepName || order.salesRepEmail || undefined,
        purchaseOrderNumber: order.purchaseOrderNumber || undefined,
        branchName: order.branchName || undefined,
        notes: order.notes || undefined,
      };
      navigation.navigate('QuoteSummary', { summary });
    },
    [navigation],
  );

  const renderCard = ({ item }: { item: Order }) => {
    const pill = pillColors(item.status);
    const salesRep = compact(item.salesRepName || item.salesRepEmail);
    const poNumber = compact(item.purchaseOrderNumber);
    const subtitle = compact(item.shortDescription)?.replace(/\s*\|\s*/g, ' - ') || compact(item.customerName);

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => openSummary(item)}>
        <View style={styles.thumbWrap}>
          {item.designImageUrl ? (
            <Image source={{ uri: item.designImageUrl, cache: 'force-cache' }} style={styles.thumbImage} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons name="diamond-outline" size={16} color="#B2874A" />
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardHeadRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{designName(item) || designNo(item) || item.orderNumber}</Text>
            <View style={[styles.statusPill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
              <Text style={[styles.statusPillText, { color: pill.text }]}>{statusLabel(item.status)}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.cardMeta} numberOfLines={2}>{subtitle || 'No details'}</Text>
            <Text style={styles.price}>{money(item.price)}</Text>
          </View>
          <View style={styles.orderMetaLine}>
            <View style={styles.orderMetaItem}>
              <Ionicons name="calendar-outline" size={10} color="#9A7843" />
              <Text style={styles.orderDateText} numberOfLines={1}>{formatOrderDate(item.createdAt)}</Text>
            </View>
            {poNumber ? (
              <>
                <View style={styles.orderMetaDivider} />
                <Text style={styles.poInlineText} numberOfLines={1}>
                  <Text style={styles.poLabel}>Client PO </Text>
                  {poNumber}
                </Text>
              </>
            ) : null}
            {shouldShowSalesRep && salesRep ? (
              <>
                <View style={styles.orderMetaDivider} />
                <Ionicons name="person-outline" size={10} color="#9A7843" />
                <Text style={styles.salesRepText} numberOfLines={1}>{salesRep}</Text>
              </>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color="#5F5145" />
          <Text style={styles.headerTitle}>{PERIODS.find((item) => item.key === period)?.label} Orders</Text>
        </TouchableOpacity>
        <Text style={styles.totalText}>{totalRecords} total</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={14} color="#A3968C" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search PO# or client name..."
            placeholderTextColor="#A3968C"
            style={styles.searchInput}
          />
        </View>
        <View style={styles.filterSummaryRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {PERIODS.map((item) => {
              const selected = item.key === period;
              const itemSummary = periodSummary[PERIOD_SUMMARY_KEYS[item.key]];
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.filterChip, selected ? styles.filterChipActive : null]}
                  onPress={() => setPeriod(item.key)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.filterLabel, selected ? styles.filterLabelActive : null]}>{item.label}</Text>
                  <Text style={[styles.filterCount, selected ? styles.filterCountActive : null]}>{itemSummary.count}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={styles.filterTotalAmount} numberOfLines={1}>{money(selectedSummary.totalAmount)}</Text>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={visibleOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOrders} tintColor="#8a6b55" colors={['#8a6b55']} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="small" color="#8a6b55" />
              <Text style={styles.emptyText}>Loading orders...</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Ionicons name="receipt-outline" size={24} color="#A67F3F" />
              <Text style={styles.emptyTitle}>No orders found</Text>
              <Text style={styles.emptyText}>Try another period or search keyword.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBFAF8' },
  header: {
    height: 46,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE4D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { color: '#1F1712', fontSize: 15, fontWeight: '800' },
  totalText: { color: '#8D7867', fontSize: 11, fontWeight: '700' },
  controls: { paddingHorizontal: 10, paddingTop: 9, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  searchBox: {
    height: 34,
    borderWidth: 1,
    borderColor: '#E5D4C6',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFDFC',
  },
  searchInput: { flex: 1, color: '#2B211A', fontSize: 12, paddingVertical: 0 },
  filterSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterRow: { gap: 8, paddingTop: 9, paddingBottom: 2, paddingRight: 2 },
  filterTotalAmount: { minWidth: 58, textAlign: 'right', color: '#B47A3C', fontSize: 17, fontWeight: '900', paddingTop: 7 },
  filterChip: {
    minWidth: 72,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E6D3C0',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFDFC',
  },
  filterChipActive: { backgroundColor: '#1F1712', borderColor: '#1F1712' },
  filterLabel: { color: '#7F6756', fontSize: 11, fontWeight: '700' },
  filterLabelActive: { color: '#FFFFFF' },
  filterCount: { color: '#7F6756', fontSize: 11, fontWeight: '800' },
  filterCountActive: { color: '#FFFFFF' },
  errorText: { margin: 12, color: '#B42318', fontSize: 12, fontWeight: '700' },
  listContent: { padding: 10, paddingBottom: 24 },
  card: {
    minHeight: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9D8C8',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  thumbWrap: { width: 44, alignItems: 'center', paddingTop: 2 },
  thumbImage: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F4EFEA' },
  thumbPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F1EA',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: '#1D1712', fontSize: 15, fontWeight: '900' },
  statusPill: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 3 },
  cardMeta: { flex: 1, color: '#7A6D63', fontSize: 9.5, lineHeight: 13, fontWeight: '600' },
  price: { color: '#B78248', fontSize: 15, fontWeight: '900' },
  orderMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, minWidth: 0 },
  orderMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  orderMetaDivider: { width: 1, height: 10, backgroundColor: '#E7D7C9', flexShrink: 0 },
  orderDateText: { color: '#7E6B5B', fontSize: 9.5, lineHeight: 12, fontWeight: '800' },
  salesRepText: { flexShrink: 1, color: '#8A6B46', fontSize: 9.5, lineHeight: 12, fontWeight: '800' },
  poLabel: { color: '#7C6757', fontSize: 9.5, fontWeight: '800' },
  poInlineText: { flex: 1, minWidth: 0, color: '#6D584A', fontSize: 9.5, lineHeight: 12, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyTitle: { marginTop: 8, color: '#2D241E', fontSize: 14, fontWeight: '800' },
  emptyText: { marginTop: 4, color: '#8B7A6C', fontSize: 12, textAlign: 'center' },
});

export default OrderPeriodListScreen;

