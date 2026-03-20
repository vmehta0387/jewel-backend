import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchDesign } from '../api/designs';
import { fetchPricePreview } from '../api/orders';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import { formatCurrency, formatNumber } from '../utils/format';

const DesignDetailScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const route = useRoute<RouteProp<DesignsStackParamList, 'DesignDetail'>>();
  const [design, setDesign] = useState<Design | null>(null);
  const [displayPrice, setDisplayPrice] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const loadDesign = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await fetchDesign(token, route.params.designId);
      setDesign(data);
      const shouldApplyPricing =
        (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') &&
        Boolean(user?.companyId) &&
        Boolean(user?.branchId);
      if (shouldApplyPricing) {
        try {
          const preview = await fetchPricePreview(token, data.id, user?.companyId as string, user?.branchId as string);
          setDisplayPrice(preview.finalPrice ?? data.totalValue ?? 0);
        } catch {
          setDisplayPrice(data.totalValue ?? 0);
        }
      } else {
        setDisplayPrice(data.totalValue ?? 0);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load design');
    }
  }, [token, route.params.designId, user?.role, user?.companyId, user?.branchId]);

  useFocusEffect(
    useCallback(() => {
      loadDesign();
    }, [loadDesign]),
  );

  if (!design) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.muted}>{error || 'Loading design...'}</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title={design.designNo}
          subtitle={`${design.jewelryGroup || 'Design'} • ${design.jewelrySize || 'Size N/A'}`}
        />

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Design Summary</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Metal</Text>
              <Text style={styles.value}>{design.goldColour || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Diamond Spread</Text>
              <Text style={styles.value}>{design.diamondSpread || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Diamond Type</Text>
              <Text style={styles.value}>{design.diamondType || '—'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Gross Wt</Text>
              <Text style={styles.value}>{formatNumber(design.grossWeight || 0, 3)} g</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Total Value</Text>
              <Text style={styles.value}>{formatCurrency(displayPrice)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{design.designStatus || '—'}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.summaryTitle}>Gallery</Text>
          {design.imageUrls && design.imageUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryRow}>
              {design.imageUrls.map((url, index) => (
                <Image key={`${url}-${index}`} source={{ uri: url }} style={styles.galleryImage} />
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.muted}>No images available.</Text>
          )}
        </Card>

        <Button
          title="Finalize Design"
          onPress={() => navigation.navigate('FinalizeDesign', { designId: design.id })}
        />
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
  summaryCard: {
    gap: spacing.md,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
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
  galleryRow: {
    marginTop: spacing.sm,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: spacing.sm,
    backgroundColor: colors.border,
  },
});

export default DesignDetailScreen;
