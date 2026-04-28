import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { fetchBranchEmployeeBranches, fetchBranchEmployees } from '../api/branchEmployees';
import { fetchOrders } from '../api/orders';
import type { BranchOption, Order } from '../types';
import type { TeamStackParamList } from '../navigation/RootNavigator';

type BranchRow = {
  id: string;
  name: string;
  address: string;
  reps: number;
  orders: number;
  revenue: number;
  trend: number;
  status: 'active' | 'low';
};

const toMonthKey = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const formatCompactMoney = (value: number) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '$0';
  if (amount >= 1000) return `$${Math.round(amount / 1000)}k`;
  return `$${Math.round(amount)}`;
};

const formatWhole = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(Number(value || 0))));

const calcTrend = (current: number, previous: number) => {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const formatAddress = (branch: BranchOption) => {
  const base = branch.streetAddress || branch.streetAddress2 || '';
  const city = branch.city || '';
  const state = branch.stateProvince || '';
  const parts = [base, city, state].map((p) => String(p || '').trim()).filter(Boolean);
  return parts.join(', ') || `${branch.name} branch`;
};

const CompanyBranchesScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<TeamStackParamList>>();

  const [rows, setRows] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [branches, employees, ordersRes] = await Promise.all([
        fetchBranchEmployeeBranches(token),
        fetchBranchEmployees(token),
        fetchOrders(token, 1, 200, 'ALL'),
      ]);

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

      const repsByBranch = new Map<string, number>();
      (employees || []).forEach((rep) => {
        const branchId = String(rep.branch?.id || '').trim();
        if (!branchId || !rep.isActive) return;
        repsByBranch.set(branchId, (repsByBranch.get(branchId) || 0) + 1);
      });

      const orderRows = (ordersRes.data || []) as (Order & { branchId?: string | null })[];
      const perf = new Map<string, { currentRevenue: number; previousRevenue: number; currentOrders: number }>();
      orderRows
        .filter((order) => order.isActive !== false)
        .forEach((order) => {
          const branchId = String(order.branchId || '').trim();
          if (!branchId) return;
          const month = toMonthKey(order.createdAt);
          const bucket = perf.get(branchId) || { currentRevenue: 0, previousRevenue: 0, currentOrders: 0 };
          const price = Number(order.price || 0);
          if (month === currentMonth) {
            bucket.currentRevenue += price;
            bucket.currentOrders += 1;
          } else if (month === prevMonth) {
            bucket.previousRevenue += price;
          }
          perf.set(branchId, bucket);
        });

      const built = (branches || []).map((branch) => {
        const id = String(branch.id || '').trim();
        const branchPerf = perf.get(id) || { currentRevenue: 0, previousRevenue: 0, currentOrders: 0 };
        const trend = calcTrend(branchPerf.currentRevenue, branchPerf.previousRevenue);
        return {
          id,
          name: branch.name || 'Branch',
          address: formatAddress(branch),
          reps: repsByBranch.get(id) || 0,
          orders: branchPerf.currentOrders,
          revenue: branchPerf.currentRevenue,
          trend,
          status: trend >= 0 ? 'active' : 'low',
        } as BranchRow;
      });

      setRows(built.sort((a, b) => b.revenue - a.revenue));
    } catch (err: any) {
      setError(err?.message || 'Unable to load branches');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const branchCount = useMemo(() => rows.length, [rows]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (navigation as any).navigate('DashboardTab')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={18} color="#8A8279" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Branches</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.9}
          onPress={() => Alert.alert('Branches', 'Add branch flow will be added next.')}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.helperText}>{branchCount > 0 ? `${branchCount} branches` : 'No branches yet'}</Text>
        }
        renderItem={({ item }) => {
          const active = item.status === 'active';
          return (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.branchName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.branchAddr} numberOfLines={1}>{item.address}</Text>
                </View>
                <View style={[styles.statusPill, active ? styles.statusPillActive : styles.statusPillLow]}>
                  <Text style={[styles.statusPillText, active ? styles.statusTextActive : styles.statusTextLow]}>
                    {active ? 'Active' : 'Low perf.'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricRow}>
                <View style={styles.metricTile}>
                  <Text style={styles.metricLabel}>Reps</Text>
                  <Text style={styles.metricValue}>{formatWhole(item.reps)}</Text>
                </View>
                <View style={styles.metricTile}>
                  <Text style={styles.metricLabel}>Orders</Text>
                  <Text style={styles.metricValue}>{formatWhole(item.orders)}</Text>
                </View>
                <View style={[styles.metricTile, styles.metricTileRevenue]}>
                  <Text style={styles.metricLabelGold}>Rev.</Text>
                  <Text style={styles.metricValueGold}>{formatCompactMoney(item.revenue)}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.manageBtn}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('TeamList', { branchId: item.id, branchName: item.name })}
                >
                  <Text style={styles.manageBtnText}>Manage Team</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  headerRow: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE4DC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F1A15' },
  addBtn: {
    height: 30,
    borderRadius: 10,
    paddingHorizontal: 11,
    backgroundColor: '#1A1715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  helperText: { fontSize: 11, color: '#8A8178', marginBottom: 8, paddingHorizontal: 2 },
  errorText: { marginHorizontal: 14, marginTop: 8, color: '#B14B42', fontSize: 12 },
  listContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16, gap: 10 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  branchName: { fontSize: 20, lineHeight: 22, fontWeight: '700', color: '#24201A' },
  branchAddr: { marginTop: 2, fontSize: 12, color: '#8A8178', fontWeight: '500' },
  statusPill: {
    minWidth: 66,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusPillActive: { backgroundColor: '#E8F4ED', borderColor: '#B9DCC5' },
  statusPillLow: { backgroundColor: '#F4F2EF', borderColor: '#E0DAD0' },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  statusTextActive: { color: '#3E8358' },
  statusTextLow: { color: '#2B2722' },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metricTile: {
    flex: 1,
    minHeight: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTileRevenue: {
    backgroundColor: '#F9F4EB',
    borderColor: '#E7D8C4',
  },
  metricLabel: { fontSize: 10, color: '#8D857B', fontWeight: '600' },
  metricValue: { marginTop: 3, fontSize: 20, lineHeight: 22, color: '#1B1713', fontWeight: '700' },
  metricLabelGold: { fontSize: 10, color: '#A27A3D', fontWeight: '700' },
  metricValueGold: { marginTop: 2, fontSize: 22, lineHeight: 24, color: '#A27A3D', fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8 },
  manageBtn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#151210',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtnText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
});

export default CompanyBranchesScreen;
