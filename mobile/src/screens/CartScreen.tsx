import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { createOrder } from '../api/orders';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import { colors, radii, spacing } from '../theme';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const toYyyyMmDd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CartScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { items, totalValue, removeItem, updateQuantity, clear } = useCart();

  const [shortDescription, setShortDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | null>(null);
  const [showIosDatePicker, setShowIosDatePicker] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const minimumDeliveryDate = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const canCheckout = useMemo(
    () => Boolean(token && user?.companyId && user?.branchId && items.length > 0 && !placingOrder),
    [token, user?.companyId, user?.branchId, items.length, placingOrder],
  );

  const handleCheckout = async () => {
    if (!token || !user?.companyId || !user?.branchId) {
      setError('Company and branch must be assigned to checkout.');
      return;
    }
    if (!items.length) {
      setError('Cart is empty.');
      return;
    }

    const normalizedShortDescription = shortDescription.trim();
    const normalizedNotes = notes.trim();
    const normalizedExpectedDeliveryDate = expectedDeliveryDate ? toYyyyMmDd(expectedDeliveryDate) : '';

    setPlacingOrder(true);
    setError(null);
    try {
      for (const item of items) {
        await createOrder(token, {
          companyId: user.companyId,
          branchId: user.branchId,
          designId: item.designId,
          quantity: item.quantity,
          price: Number(item.unitPrice || 0),
          deliveryDate: normalizedExpectedDeliveryDate || undefined,
          shortDescription: normalizedShortDescription || undefined,
          notes: normalizedNotes || undefined,
          status: user.role === 'BRANCH_MANAGER' ? 'APPROVED' : 'PENDING_APPROVAL',
        });
      }

      clear();
      Alert.alert(
        'Checkout successful',
        user.role === 'BRANCH_MANAGER'
          ? 'Order has been sent to Super Admin.'
          : 'Order has been sent to Branch Manager for approval.',
      );
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || 'Unable to checkout cart.');
    } finally {
      setPlacingOrder(false);
    }
  };

  const normalizeToDateOnly = (value: Date) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const openDeliveryDatePicker = () => {
    const initialValue = expectedDeliveryDate ? normalizeToDateOnly(expectedDeliveryDate) : minimumDeliveryDate;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialValue < minimumDeliveryDate ? minimumDeliveryDate : initialValue,
        mode: 'date',
        display: 'calendar',
        minimumDate: minimumDeliveryDate,
        onChange: (event, selectedDate) => {
          if (event.type !== 'set' || !selectedDate) return;
          const normalized = normalizeToDateOnly(selectedDate);
          setExpectedDeliveryDate(normalized < minimumDeliveryDate ? minimumDeliveryDate : normalized);
        },
      });
      return;
    }
    setShowIosDatePicker(true);
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(28, insets.bottom + 16) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Ionicons name="arrow-back" size={18} color="#2C1E16" />
          </TouchableOpacity>
          <Text style={styles.title}>Cart</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={clear} activeOpacity={0.9}>
            <Ionicons name="trash-outline" size={18} color="#7b4f2f" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!items.length ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cart-outline" size={28} color="#8B7355" />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add products from Design Detail screen.</Text>
          </View>
        ) : null}

        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemTop}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl, cache: 'force-cache' }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Ionicons name="diamond-outline" size={18} color="#A67F3F" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.designNo}>{item.designNo}</Text>
                <Text style={styles.designName} numberOfLines={1}>
                  {item.designName || 'Jewelry Design'}
                </Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {item.shortDescription || '-'}
                </Text>
              </View>
            </View>

            <View style={styles.itemBottom}>
              <View style={styles.qtyWrap}>
                <Text style={styles.qtyLabel}>Qty</Text>
                <TextInput
                  style={styles.qtyInput}
                  keyboardType="number-pad"
                  value={String(item.quantity)}
                  onChangeText={(value) => updateQuantity(item.id, Number(value) || 1)}
                />
              </View>
              <Text style={styles.price}>{formatMoney(item.unitPrice * item.quantity)}</Text>
              <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn} activeOpacity={0.9}>
                <Ionicons name="close" size={16} color="#a04646" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {items.length ? (
          <View style={styles.checkoutCard}>
            <Text style={styles.checkoutTitle}>Checkout</Text>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Expected Delivery Date</Text>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={openDeliveryDatePicker}
                activeOpacity={0.9}
              >
                <Text style={[styles.datePickerText, !expectedDeliveryDate ? styles.datePickerPlaceholder : null]}>
                  {expectedDeliveryDate ? toYyyyMmDd(expectedDeliveryDate) : 'Select expected delivery date'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="#7e6c5f" />
              </TouchableOpacity>
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Short Description</Text>
              <TextInput
                style={styles.deliveryInput}
                value={shortDescription}
                onChangeText={setShortDescription}
                placeholder="e.g. Customer approved showroom selection"
                placeholderTextColor="#a08f80"
              />
            </View>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes for approval / order processing"
                placeholderTextColor="#a08f80"
                multiline
                textAlignVertical="top"
              />
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatMoney(totalValue)}</Text>
            </View>
            <Button
              title={placingOrder ? 'Processing...' : 'Checkout'}
              onPress={handleCheckout}
              disabled={!canCheckout}
            />
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
                value={expectedDeliveryDate || minimumDeliveryDate}
                mode="date"
                display="inline"
                minimumDate={minimumDeliveryDate}
                onChange={(_, selectedDate) => {
                  if (!selectedDate) return;
                  const normalized = normalizeToDateOnly(selectedDate);
                  setExpectedDeliveryDate(normalized < minimumDeliveryDate ? minimumDeliveryDate : normalized);
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
  screen: {
    backgroundColor: 'transparent',
  },
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,252,245,0.75)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C1E16',
    fontFamily: 'serif',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,252,245,0.65)',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#2C1E16',
    fontSize: 16,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.sm,
    backgroundColor: 'rgba(255,252,245,0.7)',
    gap: spacing.sm,
  },
  itemTop: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  designNo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1E16',
  },
  designName: {
    fontSize: 13,
    color: '#4c3a2f',
  },
  meta: {
    fontSize: 12,
    color: '#7e6c5f',
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 126,
  },
  qtyLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  qtyInput: {
    width: 72,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 0,
    color: '#2C1E16',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  price: {
    flex: 1,
    textAlign: 'right',
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1E16',
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#efc6c6',
    backgroundColor: '#fff5f5',
  },
  checkoutCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(255,252,245,0.72)',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  checkoutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1E16',
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  deliveryInput: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: '#2C1E16',
    backgroundColor: 'rgba(255,255,255,0.45)',
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
  },
  datePickerText: {
    color: '#2C1E16',
    fontSize: 14,
  },
  datePickerPlaceholder: {
    color: '#a08f80',
  },
  notesInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    color: '#2C1E16',
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#5d4c40',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    color: '#2C1E16',
    fontWeight: '700',
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
});

export default CartScreen;
