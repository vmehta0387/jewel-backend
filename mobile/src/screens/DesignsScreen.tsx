import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchDesigns } from '../api/designs';
import type { Design } from '../types';
import type { DesignsStackParamList } from '../navigation/RootNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatCurrency } from '../utils/format';

const DesignsScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<DesignsStackParamList>>();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDesigns = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDesigns(token);
      setDesigns(response.data || []);
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

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Available Designs</Text>
        <Text style={styles.subtitle}>Select a design to finalize with the customer.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={designs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadDesigns}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('DesignDetail', { designId: item.id })}
          >
            <Card style={styles.card}>
              <Text style={styles.designNo}>{item.designNo}</Text>
              <Text style={styles.meta}>{item.jewelryGroup}</Text>
              <View style={styles.row}>
                <Text style={styles.meta}>{item.jewelrySize || '-'}</Text>
                <Text style={styles.price}>{formatCurrency(item.totalValue || 0)}</Text>
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
  designNo: {
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

export default DesignsScreen;
