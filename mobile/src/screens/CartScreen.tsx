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
import { LinearGradient } from 'expo-linear-gradient';

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

  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
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
          purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          customerEmail: customerEmail.trim() || undefined,
          notes: normalizedNotes || undefined,
          status: user.role === 'BRANCH_MANAGER' ? 'APPROVED' : 'PENDING_APPROVAL',
        });
      }

      clear();
      Alert.alert(
        'Quote sent successfully',
        user.role === 'BRANCH_MANAGER'
          ? 'Quote has been sent to Super Admin.'
          : 'Quote has been sent to Branch Manager for approval.',
      );
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || 'Unable to submit quote.');
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
    <View style={styles.screenView}>
      <LinearGradient colors={['#FCFAF8', '#F5EBE1', '#E8D5C4']} style={StyleSheet.absoluteFillObject} />
      
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md, paddingBottom: Math.max(160, insets.bottom + 140) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Ionicons name="close" size={20} color="#2C1E16" />
          </TouchableOpacity>
          <View style={styles.headTextGroup}>
            <Text style={styles.title}>New quote</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={clear} activeOpacity={0.9}>
            <Ionicons name="trash-outline" size={18} color="#7b4f2f" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!items.length ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cart-outline" size={28} color="#8B7355" />
            <Text style={styles.emptyTitle}>Your builder is empty</Text>
            <Text style={styles.emptyText}>Add products from the design catalog.</Text>
          </View>
        ) : null}

        <View style={styles.itemsWrapper}>
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
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <Text style={styles.designName} numberOfLines={2}>
                      {item.designName || item.designNo}
                    </Text>
                    <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn} activeOpacity={0.8}>
                      <Ionicons name="close" size={14} color="#a04646" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.meta} numberOfLines={2}>
                    {item.shortDescription || `Size/Spec N/A`}
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
              </View>
            </View>
          ))}
        </View>

        {items.length > 0 && (
          <TouchableOpacity style={styles.addAnotherBtn} onPress={() => navigation.navigate('DesignsTab' as never)} activeOpacity={0.8}>
            <Text style={styles.addAnotherText}>+ Add another item</Text>
          </TouchableOpacity>
        )}

        {items.length > 0 && (
          <>
            <View style={styles.customerCard}>
              <Text style={styles.sectionHeading}>CUSTOMER INFO</Text>

              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Name</Text>
                <TextInput
                  style={styles.customerInput}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="e.g. Jennifer Walsh"
                  placeholderTextColor="#A59D96"
                />
              </View>
              <View style={styles.customerDivider} />

              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Phone</Text>
                <TextInput
                  style={styles.customerInput}
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  placeholder="+1 (212) 555-0198"
                  placeholderTextColor="#A59D96"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.customerDivider} />

              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Email</Text>
                <TextInput
                  style={[styles.customerInput, { color: '#4B88D1' }]} 
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  placeholder="j.walsh@email.com"
                  placeholderTextColor="#A59D96"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.customerCard}>
              <Text style={styles.sectionHeading}>ORDER DETAILS</Text>

              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>PO No.</Text>
                <TextInput
                  style={styles.customerInput}
                  value={purchaseOrderNumber}
                  onChangeText={setPurchaseOrderNumber}
                  placeholder="e.g. #PO-2024"
                  placeholderTextColor="#A59D96"
                  autoCapitalize="sentences"
                />
              </View>
              <View style={styles.customerDivider} />

              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Delivery</Text>
                <TouchableOpacity style={{ flex: 1 }} onPress={openDeliveryDatePicker} activeOpacity={0.9}>
                  <Text style={[styles.customerInputText, !expectedDeliveryDate && { color: '#A59D96' }]}>
                    {expectedDeliveryDate ? toYyyyMmDd(expectedDeliveryDate) : 'Select expected date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.customerCard}>
              <Text style={styles.sectionHeading}>NOTES</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Anniversary gift. Open to yellow gold. Before Nov 15."
                placeholderTextColor="#A59D96"
                multiline
                textAlignVertical="top"
              />
            </View>
          </>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={[styles.stickyFooter, { paddingBottom: Math.max(16, insets.bottom + 10) }]}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>{formatMoney(totalValue)}</Text>
          </View>
          <View style={styles.actionRowSticky}>
            <TouchableOpacity style={styles.saveDraftBtn} activeOpacity={0.88} onPress={() => Alert.alert('Draft Saved', 'Your quote has been saved as a draft.')}>
              <Text style={styles.saveDraftText}>Save draft</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.sendApprovalBtnContainer} 
              onPress={handleCheckout} 
              disabled={!canCheckout} 
              activeOpacity={0.88}
            >
              <LinearGradient colors={['#D8AB52', '#C6973F', '#A37728']} style={styles.sendApprovalBtn}>
                <Ionicons name="flash" size={16} color="#FFFFFF" style={styles.btnFlashIcon} />
                <Text style={styles.sendApprovalText}>{placingOrder ? 'Processing...' : 'Send for approval'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {Platform.OS === 'ios' && showIosDatePicker && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowIosDatePicker(false)}>
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    backgroundColor: '#FAF5ED',
  },
  container: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  headTextGroup: {
    alignItems: 'center',
  },
  headSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0978C',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C1E16',
    fontFamily: 'serif',
    marginTop: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8DFD5',
  },
  employeeBadge: {
    backgroundColor: '#F3E8D6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCC8B2',
  },
  employeeBadgeText: {
    fontSize: 11,
    color: '#6A5F56',
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyCard: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    backgroundColor: '#FBF9F6',
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontWeight: '700',
    color: '#2C1E16',
    fontSize: 16,
  },
  emptyText: {
    color: '#A0978C',
    fontSize: 13,
  },
  itemsWrapper: {
    gap: 16,
    marginBottom: 16,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#DCC8B2',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FDFBF9',
  },
  itemTop: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  thumb: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },
  thumbPlaceholder: {
    borderWidth: 1,
    borderColor: '#E3D1BC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6EFE9',
  },
  itemInfo: {
    flex: 1,
  },
  designName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1E16',
    fontFamily: 'serif',
    width: '85%',
  },
  meta: {
    fontSize: 11,
    color: '#8E8276',
    marginTop: 4,
    lineHeight: 16,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyLabel: {
    fontSize: 12,
    color: '#8E8276',
    fontWeight: '600',
  },
  qtyInput: {
    width: 60,
    height: 36,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    borderRadius: 8,
    color: '#2C1E16',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#FBF9F6',
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: '#C6973F',
    fontFamily: 'serif',
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff0f0',
  },
  addAnotherBtn: {
    borderWidth: 1.5,
    borderColor: '#DCC8B2',
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 24,
  },
  addAnotherText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A5F56',
  },
  customerCard: {
    borderWidth: 1,
    borderColor: '#DCC8B2',
    borderRadius: 16,
    backgroundColor: '#FDFBF9',
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0978C',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  customerDivider: {
    height: 1,
    backgroundColor: '#F0E8DD',
    marginLeft: 16,
  },
  customerLabel: {
    width: 80,
    fontSize: 13,
    color: '#8E8276',
    fontWeight: '500',
  },
  customerInput: {
    flex: 1,
    fontSize: 14,
    color: '#2C1E16',
    fontWeight: '600',
    padding: 0,
  },
  customerInputText: {
    fontSize: 14,
    color: '#2C1E16',
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 80,
    fontSize: 14,
    color: '#2C1E16',
    paddingHorizontal: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FDFBF9',
    borderTopWidth: 1,
    borderTopColor: '#E8DFD5',
    paddingHorizontal: 20,
    paddingTop: 16,
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 20,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subtotalLabel: {
    fontSize: 14,
    color: '#6A5F56',
    fontWeight: '600',
  },
  subtotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C1E16',
    fontFamily: 'serif',
  },
  actionRowSticky: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveDraftBtn: {
    flex: 0.45,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCC8B2',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8276',
  },
  sendApprovalBtnContainer: {
    flex: 0.55,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendApprovalBtn: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFlashIcon: {
    marginRight: 6,
  },
  sendApprovalText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
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
