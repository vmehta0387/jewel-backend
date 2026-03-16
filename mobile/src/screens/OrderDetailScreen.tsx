import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import StatCard from '../components/StatCard';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchOrder, updateOrder } from '../api/orders';
import type { Order } from '../types';
import type { OrdersStackParamList } from '../navigation/RootNavigator';
import { formatCurrency, formatDate } from '../utils/format';

const statuses = ['QUOTE', 'PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'SHIPPED', 'DELIVERED'];

const OrderDetailScreen = () => {
  const { token, user } = useAuth();
  const route = useRoute<RouteProp<OrdersStackParamList, 'OrderDetail'>>();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await fetchOrder(token, route.params.orderId);
      setOrder(data);
      setStatus(data.status || '');
      setDeliveryDate(data.deliveryDate || '');
    } catch (err: any) {
      setError(err?.message || 'Unable to load order');
    }
  }, [route.params.orderId, token]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder]),
  );

  const handleUpdate = async () => {
    if (!token || !order) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOrder(token, order.id, {
        status,
        deliveryDate: deliveryDate || undefined,
      });
      setOrder(updated);
    } catch (err: any) {
      setError(err?.message || 'Unable to update order');
    } finally {
      setSaving(false);
    }
  };

  if (!order) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.muted}>{error || 'Loading order...'}</Text>
      </Screen>
    );
  }

  const canManage = user?.role === 'BRANCH_MANAGER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title={order.orderNumber} subtitle={order.designNo || 'Design'} />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.row}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Company</Text>
              <Text style={styles.value}>{order.companyName || '-'}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Branch</Text>
              <Text style={styles.value}>{order.branchName || '-'}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Created</Text>
              <Text style={styles.value}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Delivery</Text>
              <Text style={styles.value}>{formatDate(order.deliveryDate)}</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <StatCard label="Status" value={order.status || '-'} />
            <StatCard label="Total" value={formatCurrency(order.price)} />
          </View>
        </Card>

        {canManage ? (
          <Card>
            <Text style={styles.sectionTitle}>Manage Order</Text>
            <Text style={styles.fieldLabel}>Status</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={status} onValueChange={setStatus}>
                {statuses.map((value) => (
                  <Picker.Item key={value} label={value} value={value} />
                ))}
              </Picker>
            </View>

            <Text style={styles.fieldLabel}>Delivery Date</Text>
            <TextInput
              style={styles.input}
              placeholder="dd-mm-yyyy"
              value={deliveryDate}
              onChangeText={setDeliveryDate}
            />

            <Button title={saving ? 'Saving...' : 'Update Order'} onPress={handleUpdate} disabled={saving} />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  muted: {
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  infoBlock: {
    width: '47%',
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  fieldLabel: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: '#fff',
  },
});

export default OrderDetailScreen;
