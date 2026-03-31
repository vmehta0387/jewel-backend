import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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

const CartScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { items, totalValue, removeItem, updateQuantity, clear } = useCart();

  const [shortDescription, setShortDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
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
    gap: 6,
  },
  qtyLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  qtyInput: {
    width: 56,
    height: 34,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    color: '#2C1E16',
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
  notesInput: {
    minHeight: Platform.OS === 'ios' ? 96 : 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: '#2C1E16',
    backgroundColor: 'rgba(255,255,255,0.45)',
    marginBottom: Platform.OS === 'ios' ? 12 : 10,
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
});

export default CartScreen;
