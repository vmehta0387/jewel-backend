import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchOrder, updateOrder } from '../api/orders';
import { fetchDesign } from '../api/designs';
import type { Design, Order } from '../types';
import type { OrdersStackParamList } from '../navigation/RootNavigator';
import { formatDate } from '../utils/format';

const formatStatusLabel = (value?: string | null) =>
  String(value || 'PENDING_APPROVAL')
    .toLowerCase()
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');

const formatStatusCardValue = (value?: string | null) => {
  const normalized = String(value || 'PENDING_APPROVAL').toUpperCase();
  if (normalized === 'PENDING_APPROVAL') return 'Pending';
  if (normalized === 'APPROVED') return 'Approved';
  if (normalized === 'CANCELLED') return 'Cancelled';
  return formatStatusLabel(value);
};

const formatCompactCurrency = (value: number | string | null | undefined) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0';
  return `$${Math.round(num)}`;
};

const toYyyyMmDd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const toDateOrNull = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const OrderDetailScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<OrdersStackParamList>>();
  const route = useRoute<RouteProp<OrdersStackParamList, 'OrderDetail'>>();

  const [order, setOrder] = useState<Order | null>(null);
  const [primaryImageUrl, setPrimaryImageUrl] = useState<string | null>(null);
  const [designDetails, setDesignDetails] = useState<Design | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [showIosDatePicker, setShowIosDatePicker] = useState(false);
  const [savingDate, setSavingDate] = useState(false);
  const [actionLoading, setActionLoading] = useState<'APPROVED' | 'CANCELLED' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApproveReject = user?.role === 'BRANCH_MANAGER';
  const isApprovedOrder = order?.status === 'APPROVED';
  const minimumDeliveryDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const loadOrder = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrder(token, route.params.orderId);
      setOrder(data);
      setDeliveryDate(toDateOrNull(data.deliveryDate));
      setDesignDetails(null);

      let resolvedPrimaryImage: string | null = data.designImageUrl || null;
      if (data.designId) {
        try {
          const design = await fetchDesign(token, data.designId);
          setDesignDetails(design);
          const firstDesignImage =
            (design.imageUrls || []).find(
              (url): url is string => typeof url === 'string' && url.trim().length > 0,
            ) || null;
          if (firstDesignImage) {
            resolvedPrimaryImage = firstDesignImage;
          }
        } catch {
          // optional media fetch
        }
      }
      setPrimaryImageUrl(resolvedPrimaryImage);
    } catch (err: any) {
      setError(err?.message || 'Unable to load order');
    } finally {
      setLoading(false);
    }
  }, [route.params.orderId, token]);

  const gemstoneRows = useMemo(() => designDetails?.gemstones || [], [designDetails?.gemstones]);
  const gemstoneTotalWeight = useMemo(
    () => gemstoneRows.reduce((sum, row) => sum + (Number(row.wtInCts) || 0), 0),
    [gemstoneRows],
  );

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder]),
  );

  const handleSaveDeliveryDate = async () => {
    if (!token || !order) return;
    setSavingDate(true);
    setError(null);
    try {
      const updated = await updateOrder(token, order.id, {
        deliveryDate: deliveryDate ? toYyyyMmDd(deliveryDate) : undefined,
      });
      setOrder(updated);
      setDeliveryDate(toDateOrNull(updated.deliveryDate));
    } catch (err: any) {
      setError(err?.message || 'Unable to update delivery date');
    } finally {
      setSavingDate(false);
    }
  };

  const handleManagerAction = async (nextStatus: 'APPROVED' | 'CANCELLED') => {
    if (!token || !order) return;
    setActionLoading(nextStatus);
    setError(null);
    try {
      const updated = await updateOrder(token, order.id, {
        status: nextStatus,
        deliveryDate: deliveryDate ? toYyyyMmDd(deliveryDate) : undefined,
      });
      setOrder(updated);
      setDeliveryDate(toDateOrNull(updated.deliveryDate));
    } catch (err: any) {
      setError(err?.message || 'Unable to update order status');
    } finally {
      setActionLoading(null);
    }
  };

  const normalizeToDateOnly = (value: Date) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const openDeliveryDatePicker = () => {
    const initialValue = deliveryDate ? normalizeToDateOnly(deliveryDate) : minimumDeliveryDate;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialValue < minimumDeliveryDate ? minimumDeliveryDate : initialValue,
        mode: 'date',
        display: 'calendar',
        minimumDate: minimumDeliveryDate,
        onChange: (event, selectedDate) => {
          if (event.type !== 'set' || !selectedDate) return;
          const normalized = normalizeToDateOnly(selectedDate);
          setDeliveryDate(normalized < minimumDeliveryDate ? minimumDeliveryDate : normalized);
        },
      });
      return;
    }
    setShowIosDatePicker(true);
  };

  if (loading && !order) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color="#8a6b55" />
        <Text style={styles.muted}>Loading order...</Text>
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.error}>{error || 'Order not found.'}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
          <Ionicons name="arrow-back" size={18} color="#2C1E16" />
          <Text style={styles.backText}>Back to Orders</Text>
        </TouchableOpacity>

        <ScreenHeader
          title={order.orderNumber}
          subtitle={order.designNo ? `${order.designNo}${order.designVersion ? ` - ${order.designVersion}` : ''}` : 'Order detail'}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          {primaryImageUrl ? (
            <Image source={{ uri: primaryImageUrl, cache: 'force-cache' }} style={styles.designImage} resizeMode="cover" />
          ) : null}

          <View style={styles.row}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Created</Text>
              <Text style={styles.value}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Expected Delivery</Text>
              <Text style={styles.value}>{formatDate(order.deliveryDate)}</Text>
            </View>
          </View>

          <View style={styles.sourceSection}>
            <Text style={styles.sourceHeading}>Order Source</Text>
            <View style={styles.sourceGrid}>
              <View style={styles.sourceCell}>
                <Text style={styles.sourceLabel}>Company</Text>
                <Text style={styles.sourceValue} numberOfLines={1}>
                  {order.companyName?.trim() || '-'}
                </Text>
              </View>
              <View style={styles.sourceCell}>
                <Text style={styles.sourceLabel}>Branch</Text>
                <Text style={styles.sourceValue} numberOfLines={1}>
                  {order.branchName?.trim() || '-'}
                </Text>
              </View>
            </View>
            <View style={styles.sourceGrid}>
              <View style={styles.sourceCellFull}>
                <Text style={styles.sourceLabel}>Sales Rep</Text>
                <Text style={styles.sourceValue} numberOfLines={1}>
                  {order.salesRepName?.trim() || order.salesRepEmail?.trim() || '-'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statCard, styles.statCardStatus]}>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={styles.statValueStatus}>
                {formatStatusCardValue(order.status)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Qty</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {String(order.quantity || 1)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {formatCompactCurrency(order.price)}
              </Text>
            </View>
          </View>

          <View style={styles.notesBlock}>
            <Text style={styles.label}>Short Description</Text>
            <Text style={styles.notesText}>{order.shortDescription?.trim() || '-'}</Text>
          </View>

          <View style={styles.notesBlock}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notesText}>{order.notes?.trim() || '-'}</Text>
          </View>
        </Card>

        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Gemstone Information</Text>
          {gemstoneRows.length === 0 ? (
            <Text style={styles.emptyGemText}>No gemstone lines available for this design.</Text>
          ) : (
            <View style={styles.gemstoneList}>
              {gemstoneRows.map((row, index) => (
                <View key={`gem-${index}-${row.stone || 'na'}-${row.shape || 'na'}-${row.size || 'na'}`} style={styles.gemstoneRow}>
                  <View style={styles.gemstoneTopRow}>
                    <Text style={styles.gemstoneTitle}>{row.stone || 'Gemstone'}</Text>
                    <Text style={styles.gemstoneWeight}>{(Number(row.wtInCts) || 0).toFixed(3)} cts</Text>
                  </View>
                  <Text style={styles.gemstoneMeta}>
                    {(row.shape || 'Shape N/A')} • {(row.size || 'Size N/A')} • {(row.color || 'Color N/A')} • {(row.quality || 'Quality N/A')}
                  </Text>
                </View>
              ))}
              <View style={styles.gemstoneFooter}>
                <Text style={styles.gemstoneFooterLabel}>Total Gem Weight</Text>
                <Text style={styles.gemstoneFooterValue}>{gemstoneTotalWeight.toFixed(3)} cts</Text>
              </View>
            </View>
          )}
        </Card>

        {canApproveReject ? (
          <Card style={styles.manageCard}>
            <Text style={styles.sectionTitle}>Manager Approval</Text>
            <Text style={styles.currentStatusLine}>
              Current Status: <Text style={styles.currentStatusValue}>{formatStatusLabel(order.status)}</Text>
            </Text>

            <Text style={styles.fieldLabel}>Expected Delivery Date</Text>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={openDeliveryDatePicker}
              activeOpacity={0.9}
            >
              <Text style={[styles.datePickerText, !deliveryDate ? styles.datePickerPlaceholder : null]}>
                {deliveryDate ? toYyyyMmDd(deliveryDate) : 'Select expected delivery date'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#7e6c5f" />
            </TouchableOpacity>

            {!isApprovedOrder ? (
              <View style={styles.actionRow}>
                <Button
                  title="Approve"
                  onPress={() => handleManagerAction('APPROVED')}
                  loading={actionLoading === 'APPROVED'}
                  disabled={Boolean(actionLoading)}
                  style={styles.actionButton}
                />
                <Button
                  title="Cancel"
                  onPress={() => handleManagerAction('CANCELLED')}
                  variant="ghost"
                  loading={actionLoading === 'CANCELLED'}
                  disabled={Boolean(actionLoading)}
                  style={styles.cancelButton}
                />
              </View>
            ) : (
              <View style={styles.approvedInfoWrap}>
                <Text style={styles.approvedInfoText}>
                  This order is approved. Status actions are locked.
                </Text>
              </View>
            )}

            <Button
              title={savingDate ? 'Saving date...' : 'Save Delivery Date'}
              onPress={handleSaveDeliveryDate}
              disabled={savingDate || Boolean(actionLoading)}
              variant="secondary"
            />
          </Card>
        ) : null}
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <Modal visible={showIosDatePicker} transparent animationType="fade" onRequestClose={() => setShowIosDatePicker(false)}>
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerSheet}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setShowIosDatePicker(false)} activeOpacity={0.9}>
                  <Text style={styles.iosPickerAction}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowIosDatePicker(false)} activeOpacity={0.9}>
                  <Text style={styles.iosPickerAction}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={deliveryDate || minimumDeliveryDate}
                mode="date"
                display="inline"
                minimumDate={minimumDeliveryDate}
                onChange={(_, selectedDate) => {
                  if (!selectedDate) return;
                  const normalized = normalizeToDateOnly(selectedDate);
                  setDeliveryDate(normalized < minimumDeliveryDate ? minimumDeliveryDate : normalized);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: 'rgba(255,252,245,0.7)',
    marginBottom: -6,
  },
  backText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f3b2f',
  },
  muted: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,252,245,0.68)',
  },
  manageCard: {
    backgroundColor: 'rgba(255,252,245,0.68)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: '#2C1E16',
  },
  designImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.42)',
    paddingVertical: 9,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  statCardStatus: {
    flex: 1.15,
  },
  statLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '600',
  },
  statValue: {
    marginTop: 4,
    fontSize: Platform.OS === 'android' ? 15 : 16,
    fontWeight: '700',
    color: '#2C1E16',
    includeFontPadding: false,
  },
  statValueStatus: {
    marginTop: 4,
    fontSize: Platform.OS === 'android' ? 14 : 15,
    fontWeight: '700',
    color: '#2C1E16',
    includeFontPadding: false,
  },
  infoBlock: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
  value: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  notesBlock: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  notesText: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b3b2f',
    lineHeight: 19,
  },
  sourceSection: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  sourceHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 2,
  },
  sourceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sourceCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.36)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sourceCellFull: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.36)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sourceLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    fontWeight: '600',
  },
  sourceValue: {
    marginTop: 3,
    fontSize: 13,
    color: '#3d2f25',
    fontWeight: '700',
  },
  emptyGemText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  gemstoneList: {
    gap: spacing.sm,
  },
  gemstoneRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  gemstoneTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gemstoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C1E16',
  },
  gemstoneWeight: {
    fontSize: 12,
    color: '#5f4b3d',
    fontWeight: '600',
  },
  gemstoneMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6f5e52',
    lineHeight: 18,
  },
  gemstoneFooter: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gemstoneFooterLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  gemstoneFooterValue: {
    fontSize: 14,
    color: '#2C1E16',
    fontWeight: '700',
  },
  fieldLabel: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
  datePickerTrigger: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  datePickerText: {
    color: '#2C1E16',
    fontSize: 14,
  },
  datePickerPlaceholder: {
    color: '#a08f80',
  },
  iosPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  iosPickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
  },
  iosPickerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e6dfd8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iosPickerAction: {
    color: '#7b4f2f',
    fontSize: 15,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  currentStatusLine: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  currentStatusValue: {
    color: '#4f3b2f',
    fontWeight: '700',
  },
  approvedInfoWrap: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#c9dccf',
    borderRadius: 10,
    backgroundColor: 'rgba(228,245,234,0.7)',
  },
  approvedInfoText: {
    fontSize: 12,
    color: '#356b48',
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c99898',
    borderRadius: 10,
    backgroundColor: 'rgba(255,245,245,0.6)',
  },
});

export default OrderDetailScreen;
