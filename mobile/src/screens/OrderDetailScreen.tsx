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
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { fetchOrder, updateOrder } from '../api/orders';
import { fetchDesign } from '../api/designs';
import type { Design, Order } from '../types';
import type { OrdersStackParamList } from '../navigation/RootNavigator';

const formatStatusLabel = (value?: string | null) =>
  String(value || 'PENDING_APPROVAL')
    .toLowerCase()
    .split('_')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');

const formatCompactCurrency = (value: number | string | null | undefined) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
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

const formatDateLocal = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

type DetailRowProps = { label: string; value?: string | number | null; boldValue?: boolean };
const DetailRow = ({ label, value, boldValue = false }: DetailRowProps) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, boldValue && styles.detailValueBold]}>{value || '-'}</Text>
  </View>
);

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
      <View style={styles.center}>
        <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator color="#D8AB52" />
        <Text style={styles.muted}>Loading detail...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
        <Text style={styles.errorText}>{error || 'Order not found.'}</Text>
      </View>
    );
  }
  
  // Resolve Status string
  const activeDesignStatus = (() => {
    if (designDetails?.stage) return designDetails.stage;
    const row = designDetails as any;
    if (typeof row?.isActive === 'boolean') return row?.isActive ? 'Active' : 'Inactive';
    if (typeof row?.status === 'string') return row?.status;
    return undefined;
  })();

  return (
    <View style={styles.screenView}>
      <LinearGradient colors={['#FFFFFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />
      
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerArea}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Ionicons name="arrow-back" size={18} color="#2C1E16" />
            <Text style={styles.backText}>Back to Orders</Text>
          </TouchableOpacity>

          <View style={styles.screenHeader}>
            <Text style={styles.headerTitle}>{order.orderNumber}</Text>
            <Text style={styles.headerSubtitle}>
              {order.designNo ? `${order.designNo}${order.designVersion ? ` - ${order.designVersion}` : ''}` : 'Order detail'}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {primaryImageUrl ? (
          <View style={[styles.card, { padding: 12 }]}>
            <View style={[styles.mediaGallery, { marginBottom: 0 }]}>
              <Image source={{ uri: primaryImageUrl, cache: 'force-cache' }} style={styles.designImage} resizeMode="cover" />
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Design Specifications</Text>
          <View style={styles.detailsList}>
            <DetailRow label="Design No" value={order.designNo} boldValue />
            <DetailRow label="Status" value={activeDesignStatus} />
            <DetailRow label="Category" value={designDetails?.jewelryGroup} />
            <DetailRow label="Sub Category" value={designDetails?.collection} />
            <DetailRow label="Jewelry Size" value={designDetails?.jewelrySize} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Diamond Metrics</Text>
          <View style={styles.detailsList}>
            <DetailRow label="Diamond Type" value={designDetails?.diamondType} />
            <DetailRow label="Diamond Spread" value={designDetails?.diamondSpread} />
            <DetailRow label="Diamond Wt" value={designDetails?.diamondWeight || gemstoneTotalWeight.toFixed(3)} />
            <DetailRow label="Diamond Quality" value={designDetails?.diamondQuality} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order & Fulfillment</Text>
          <View style={styles.detailsList}>
            <DetailRow label="Price" value={formatCompactCurrency(order.price)} boldValue />
            <DetailRow label="Quantity" value={order.quantity} />
            <DetailRow label="Delivery Date" value={formatDateLocal(order.deliveryDate)} />
            <DetailRow label="Purchase Order" value={order.purchaseOrderNumber} />
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.textLabel}>Short Description</Text>
            <Text style={styles.textValue}>{order.shortDescription?.trim() || '-'}</Text>
          </View>

          <View style={styles.textBlock}>
            <Text style={styles.textLabel}>Notes</Text>
            <Text style={styles.textValue}>{order.notes?.trim() || '-'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Client Context</Text>
          <View style={styles.detailsList}>
            <DetailRow label="Customer Name" value={order.customerName} />
            <DetailRow label="Customer Phone" value={order.customerPhone} />
            <DetailRow label="Customer Email" value={order.customerEmail} />
            <DetailRow label="Company" value={order.companyName} />
            <DetailRow label="Branch" value={order.branchName} />
            <DetailRow label="Sales Rep" value={order.salesRepName || order.salesRepEmail} />
          </View>
        </View>

        <View style={[styles.card, { paddingHorizontal: 0 }]}>
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={styles.sectionTitle}>Stone Information</Text>
          </View>

          {gemstoneRows.length === 0 ? (
            <Text style={styles.emptyGemText}>-</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableScrollArea}>
              <View style={styles.tableContainer}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableCellHeader, { width: 120 }]}>Packet</Text>
                  <Text style={[styles.tableCellHeader, { width: 90 }]}>Stone</Text>
                  <Text style={[styles.tableCellHeader, { width: 80 }]}>Shape</Text>
                  <Text style={[styles.tableCellHeader, { width: 70 }]}>Size</Text>
                  <Text style={[styles.tableCellHeader, { width: 80 }]}>Color</Text>
                  <Text style={[styles.tableCellHeader, { width: 80 }]}>Quality</Text>
                  <Text style={[styles.tableCellHeader, { width: 70 }]}>Wt/Pcs</Text>
                  <Text style={[styles.tableCellHeader, { width: 60 }]}>Pcs</Text>
                  <Text style={[styles.tableCellHeader, { width: 80, paddingRight: 16 }]}>Wt (Cts)</Text>
                </View>

                {/* Table Body */}
                {gemstoneRows.map((row, index) => (
                  <View key={`gem-${index}`} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{row.packetId || '-'}</Text>
                    <Text style={[styles.tableCell, { width: 90 }]}>{row.stone || '-'}</Text>
                    <Text style={[styles.tableCell, { width: 80 }]}>{row.shape || '-'}</Text>
                    <Text style={[styles.tableCell, { width: 70 }]}>{row.size || '-'}</Text>
                    <Text style={[styles.tableCell, { width: 80 }]}>{row.color || '-'}</Text>
                    <Text style={[styles.tableCell, { width: 80 }]}>{row.quality || '-'}</Text>
                    <Text style={[styles.tableCell, { width: 70 }]}>-</Text>
                    <Text style={[styles.tableCell, { width: 60 }]}>-</Text>
                    <Text style={[styles.tableCell, { width: 80, paddingRight: 16 }]}>{(Number(row.wtInCts) || 0).toFixed(3)}</Text>
                  </View>
                ))}

                {/* Table Footer */}
                <View style={styles.tableFooterRow}>
                  <Text style={styles.tableCellFooterBold}>Total Wt:</Text>
                  <Text style={styles.tableCellFooterValue}>{gemstoneTotalWeight.toFixed(3)}</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>

        {canApproveReject ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Manager Approval</Text>
            <View style={styles.statusDisplayWrap}>
              <Text style={styles.statusDisplayTitle}>Current Status</Text>
              <Text style={styles.statusDisplayValue}>{formatStatusLabel(order.status)}</Text>
            </View>

            <Text style={styles.fieldLabel}>Expected Delivery Date</Text>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={openDeliveryDatePicker}
              activeOpacity={0.9}
            >
              <Text style={[styles.datePickerText, !deliveryDate ? styles.datePickerPlaceholder : null]}>
                {deliveryDate ? toYyyyMmDd(deliveryDate) : 'Select expected delivery date'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#A79687" />
            </TouchableOpacity>

            {!isApprovedOrder ? (
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={styles.actionBtnWrap} 
                  disabled={Boolean(actionLoading)} 
                  onPress={() => handleManagerAction('APPROVED')}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={['#D8AB52', '#C6973F', '#A37728']} style={styles.actionBtnPrimary}>
                    {actionLoading === 'APPROVED' ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{marginRight: 6}} />
                        <Text style={styles.actionBtnPrimaryText}>Approve Quote</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionBtnWrap} 
                  disabled={Boolean(actionLoading)} 
                  onPress={() => handleManagerAction('CANCELLED')}
                  activeOpacity={0.88}
                >
                  <View style={styles.actionBtnSecondary}>
                    {actionLoading === 'CANCELLED' ? (
                      <ActivityIndicator color="#A04646" size="small" />
                    ) : (
                      <Text style={styles.actionBtnSecondaryText}>Cancel</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.approvedInfoWrap}>
                <Text style={styles.approvedInfoText}>
                  This order is approved. Status actions are locked.
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.actionBtnWrap, { marginTop: 12 }]} 
              disabled={savingDate || Boolean(actionLoading)} 
              onPress={handleSaveDeliveryDate}
              activeOpacity={0.88}
            >
              <View style={styles.saveDateBtn}>
                {savingDate ? (
                  <ActivityIndicator color="#6A5F56" size="small" />
                ) : (
                  <Text style={styles.saveDateBtnText}>Save Delivery Date</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    backgroundColor: '#FAF5ED',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 24 : 48,
    paddingBottom: Platform.OS === 'android' ? 40 : 60,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5ED',
  },
  headerArea: {
    marginBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E8DFD5',
    borderRadius: 999,
    backgroundColor: '#FDFBF9',
    marginBottom: 16,
  },
  backText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6A5F56',
  },
  screenHeader: {
    paddingLeft: 4,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 32,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8276',
  },
  muted: {
    color: '#8E8276',
    marginTop: 12,
    fontWeight: '500',
  },
  errorText: {
    color: '#A04646',
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    borderWidth: 1,
    borderColor: '#DCC8B2',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FDFBF9',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 0 : 1,
  },
  sectionTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#2C1E16',
  },
  mediaGallery: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DFD5',
    overflow: 'hidden',
  },
  designImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#FAF5ED',
  },
  detailsList: {
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8DD',
  },
  detailLabel: {
    fontSize: 13,
    color: '#8E8276',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: '#2C1E16',
    fontWeight: '500',
    flex: 1.5,
    textAlign: 'right',
  },
  detailValueBold: {
    fontWeight: '700',
    color: '#C6973F',
  },
  textBlock: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  textLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C1E16',
    marginBottom: 6,
  },
  textValue: {
    fontSize: 13,
    color: '#6A5F56',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  emptyGemText: {
    color: '#A0978C',
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
  },
  tableScrollArea: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  tableContainer: {
    minWidth: 700,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F3E8D6',
    borderBottomWidth: 1,
    borderBottomColor: '#DCC8B2',
  },
  tableCellHeader: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#8E6840',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#FDFBF9',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DFD5',
  },
  tableCell: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#6A5F56',
    fontWeight: '500',
  },
  tableFooterRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF5ED',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tableCellFooterBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8276',
    marginRight: 10,
  },
  tableCellFooterValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C1E16',
  },
  statusDisplayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FBF9F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DFD5',
  },
  statusDisplayTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8276',
  },
  statusDisplayValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C1E16',
  },
  fieldLabel: {
    marginTop: 16,
    fontSize: 12,
    color: '#8E8276',
    fontWeight: '600',
  },
  datePickerTrigger: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FBF9F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  datePickerText: {
    color: '#2C1E16',
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerPlaceholder: {
    color: '#A59D96',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 4,
  },
  actionBtnWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  actionBtnPrimary: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnSecondary: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E8A3A3',
    backgroundColor: '#FDF5F5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#A04646',
  },
  saveDateBtn: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6A5F56',
  },
  approvedInfoWrap: {
    marginTop: 20,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#C9DCCF',
    borderRadius: 12,
    backgroundColor: '#E4F5EA',
  },
  approvedInfoText: {
    fontSize: 13,
    color: '#346B48',
    fontWeight: '600',
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
    borderBottomColor: '#F0E8DD',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iosPickerAction: {
    color: '#C6973F',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OrderDetailScreen;

