import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import StatCard from '../components/StatCard';
import { colors, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchOrderSummary } from '../api/orders';
import { fetchBranchEmployeeBranches } from '../api/branchEmployees';
import { formatCurrency } from '../utils/format';
import type { BranchOption } from '../types';

const BranchDashboardScreen = () => {
  const { token, user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<{ ordersReceivedToday: number; ordersDueToday: number; salesThisWeek: number; activeOrders: number } | null>(null);
  const [branch, setBranch] = useState<BranchOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isManager = user?.role === 'BRANCH_MANAGER' || user?.role === 'COMPANY_ADMIN';

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setError(null);
    const results = await Promise.allSettled([
      fetchOrderSummary(token),
      fetchBranchEmployeeBranches(token),
    ]);

    const [summaryResult, branchesResult] = results;
    let nextError: string | null = null;

    if (summaryResult.status === 'fulfilled') {
      setSummary(summaryResult.value);
    } else {
      const status = summaryResult.reason?.status;
      if (status && status !== 401 && status !== 403) {
        nextError = summaryResult.reason?.message || 'Unable to load dashboard';
      }
    }

    if (branchesResult.status === 'fulfilled') {
      setBranch(branchesResult.value?.[0] || null);
    } else {
      const status = branchesResult.reason?.status;
      if (!nextError && status && status !== 401 && status !== 403) {
        nextError = branchesResult.reason?.message || 'Unable to load dashboard';
      }
    }
    if (nextError) {
      setError(nextError);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]),
  );

  const address = useMemo(() => {
    if (!branch) return 'Not set';
    const parts = [
      branch.streetAddress,
      branch.streetAddress2,
      branch.city,
      branch.stateProvince,
      branch.postalCode,
      branch.country,
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Not set';
  }, [branch]);

  return (
    <Screen>
      <ScreenHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.firstName || 'Manager'}`}
        rightSlot={<Button title="Sign Out" variant="ghost" onPress={signOut} />}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card>
          <Text style={styles.sectionTitle}>Employee Profile</Text>
          <View style={styles.profileRow}>
            <View style={styles.profileBlock}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—'}</Text>
            </View>
            <View style={styles.profileBlock}>
              <Text style={styles.label}>Role</Text>
              <Text style={styles.value}>{user?.role || '—'}</Text>
            </View>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.profileBlockFull}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email || '—'}</Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Branch Profile</Text>
          <View style={styles.profileRow}>
            <View style={styles.profileBlock}>
              <Text style={styles.label}>Branch</Text>
              <Text style={styles.value}>{branch?.name || 'Not assigned'}</Text>
            </View>
            <View style={styles.profileBlock}>
              <Text style={styles.label}>Store Code</Text>
              <Text style={styles.value}>{branch?.code || '—'}</Text>
            </View>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.profileBlockFull}>
              <Text style={styles.label}>Address</Text>
              <Text style={styles.value}>{address}</Text>
            </View>
          </View>
          <View style={styles.profileRow}>
            <View style={styles.profileBlock}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{branch?.phone || '—'}</Text>
            </View>
            <View style={styles.profileBlock}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{branch?.email || '—'}</Text>
            </View>
          </View>
        </Card>

        {summary ? (
          <Card>
            <Text style={styles.sectionTitle}>Order Activity</Text>
            <View style={styles.statsRow}>
              <StatCard label="Orders Received" value={String(summary.ordersReceivedToday)} hint="Today" />
              <StatCard label="Due Today" value={String(summary.ordersDueToday)} hint="Delivery" />
            </View>
            <View style={styles.statsRow}>
              <StatCard label="Sales This Week" value={formatCurrency(summary.salesThisWeek)} hint="Week to date" />
              <StatCard label="Active Orders" value={String(summary.activeOrders)} hint="Pipeline" />
            </View>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <Button title="View Orders" onPress={() => navigation.navigate('OrdersTab')} style={styles.actionButton} />
            <Button title="View Designs" variant="secondary" onPress={() => navigation.navigate('DesignsTab')} style={styles.actionButton} />
            {isManager ? (
              <Button title="Manage Team" variant="secondary" onPress={() => navigation.navigate('TeamTab')} style={styles.actionButton} />
            ) : null}
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Sales Goals</Text>
          <Text style={styles.muted}>No goals configured yet. We can wire this into the admin portal once goals are set.</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
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
  profileRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  profileBlock: {
    flex: 1,
  },
  profileBlockFull: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
  value: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
  },
  muted: {
    color: colors.textMuted,
  },
});

export default BranchDashboardScreen;
