import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import ScreenHeader from '../components/ScreenHeader';
import StatCard from '../components/StatCard';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchOrders, fetchOrderSummary } from '../api/orders';
import type { Order } from '../types';
import type { OrdersStackParamList } from '../navigation/RootNavigator';
import { formatCurrency, formatDate } from '../utils/format';

const OrdersScreen = () => {
  const { token, user, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{
    ordersReceivedToday: number;
    ordersDueToday: number;
    salesThisWeek: number;
    activeOrders: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const fullAccess =
        user?.role === 'BRANCH_MANAGER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SALES_REP';
      const response = await fetchOrders(token, 1, 25, fullAccess ? 'ALL' : 'ACTIVE');
      setOrders(response.data || []);

      if (fullAccess) {
        const summaryData = await fetchOrderSummary(token);
        setSummary(summaryData);
      }
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      [order.orderNumber, order.designNo, order.companyName, order.branchName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [orders, search]);

  return (
    <Screen>
      <ScreenHeader
        title="Orders"
        subtitle="Track open, past, and current orders."
        rightSlot={<Button title="Sign Out" variant="ghost" onPress={signOut} />}
      />

      <View style={styles.searchWrapper}>
        <SearchBar placeholder="Search order number, design, company" value={search} onChange={setSearch} />
      </View>

      {summary ? (
        <View style={styles.summaryGrid}>
          <View style={styles.summaryRow}>
            <StatCard label="Orders Received" value={String(summary.ordersReceivedToday)} hint="Today" />
            <StatCard label="Due Today" value={String(summary.ordersDueToday)} hint="Delivery" />
          </View>
          <View style={styles.summaryRow}>
            <StatCard label="Sales This Week" value={formatCurrency(summary.salesThisWeek)} hint="Week to date" />
            <StatCard label="Active Orders" value={String(summary.activeOrders)} hint="Pipeline" />
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadOrders}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                <Text style={styles.price}>{formatCurrency(item.price)}</Text>
              </View>
              <Text style={styles.meta}>{item.designNo || 'Design'} • {item.status}</Text>
              <Text style={styles.meta}>Delivery: {formatDate(item.deliveryDate)}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  searchWrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  summaryGrid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 6,
  },
  price: {
    fontWeight: '600',
    color: colors.primaryDark,
  },
});

export default OrdersScreen;
