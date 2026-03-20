import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import SearchBar from '../components/SearchBar';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchDesigns } from '../api/designs';
import { fetchPricePreview } from '../api/orders';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatCurrency } from '../utils/format';

const DesignsScreen = () => {
  const { token, signOut, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadDesigns = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDesigns(token);
      const baseDesigns = response.data || [];
      const shouldApplyPricing =
        (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') &&
        Boolean(user?.companyId) &&
        Boolean(user?.branchId);

      if (!shouldApplyPricing) {
        setDesigns(baseDesigns);
      } else {
        const companyId = user?.companyId as string;
        const branchId = user?.branchId as string;
        const pricedDesigns = await Promise.all(
          baseDesigns.map(async (design) => {
            try {
              const preview = await fetchPricePreview(token, design.id, companyId, branchId);
              return { ...design, displayPrice: preview.finalPrice };
            } catch {
              return { ...design, displayPrice: design.totalValue ?? 0 };
            }
          }),
        );
        setDesigns(pricedDesigns);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load designs');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadDesigns();
    }, [loadDesigns]),
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return designs;
    return designs.filter((design) =>
      [design.designNo, design.jewelryGroup, design.jewelrySize]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [designs, search]);

  return (
    <Screen>
      <ScreenHeader
        title="Designs"
        subtitle="Select a design to finalize with the customer."
        rightSlot={<Button title="Sign Out" variant="ghost" onPress={signOut} />}
      />

      <View style={styles.searchWrapper}>
        <SearchBar placeholder="Search design number, group, size" value={search} onChange={setSearch} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadDesigns}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('DesignDetail', { designId: item.id })}
          >
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.designNo}>{item.designNo}</Text>
                <Text style={styles.price}>
                  {formatCurrency(
                    (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP')
                      ? item.displayPrice ?? item.totalValue ?? 0
                      : item.totalValue ?? 0,
                  )}
                </Text>
              </View>
              <Text style={styles.meta}>{item.jewelryGroup}</Text>
              <Text style={styles.meta}>Size: {item.jewelrySize || '-'}</Text>
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
  designNo: {
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

export default DesignsScreen;
