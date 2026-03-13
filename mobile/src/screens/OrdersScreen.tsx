import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchOrders } from '../api/orders';
import type { Order } from '../types';
import type { OrdersStackParamList } from '../navigation/RootNavigator';
import { formatCurrency, formatDate } from '../utils/format';

const OrdersScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchOrders(token);
      setOrders(response.data || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load orders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Track recent orders and delivery schedule.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadOrders}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}>
            <Card style={styles.card}>
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
              <Text style={styles.meta}>{item.designNo || 'Design'} • {item.status}</Text>
              <View style={styles.row}>
                <Text style={styles.meta}>{formatDate(item.deliveryDate)}</Text>
                <Text style={styles.price}>{formatCurrency(item.price)}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
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
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  price: {
    fontWeight: '600',
    color: colors.primaryDark,
  },
});

export default OrdersScreen;
