import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { fetchBranchEmployees } from '../api/branchEmployees';
import { fetchOrders } from '../api/orders';
import type { BranchEmployee, Order } from '../types';
import type { TeamStackParamList } from '../navigation/RootNavigator';

type TeamFilter = 'ALL' | 'MANAGERS' | 'REPS';

type ManagerRow = {
  id: string;
  name: string;
  subtitle: string;
  sales: number;
  status: 'Active';
  employee?: BranchEmployee;
};

type RepRow = {
  id: string;
  name: string;
  subtitle: string;
  sales: number;
  status: 'Online' | 'Away' | 'Low';
  employee: BranchEmployee;
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

const BranchTeamScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<TeamStackParamList>>();
  const route = useRoute<RouteProp<TeamStackParamList, 'TeamList'>>();
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';

  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [monthlySalesByRep, setMonthlySalesByRep] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TeamFilter>('ALL');

  const selectedBranchId = String(route.params?.branchId || '').trim();
  const selectedBranchName = String(route.params?.branchName || '').trim();

  const loadTeam = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [employeeRows, ordersRes] = await Promise.all([fetchBranchEmployees(token), fetchOrders(token, 1, 200, 'ALL')]);
      setEmployees(employeeRows || []);
      setOrders(ordersRes.data || []);

      const currentMonth = toMonthKey(new Date().toISOString());
      const nextSales: Record<string, number> = {};
      (ordersRes.data || []).forEach((order) => {
        if (toMonthKey(order.createdAt) !== currentMonth) return;
        if (selectedBranchId) {
          const row = order as Order & { branchId?: string | null };
          if (String(row.branchId || '').trim() !== selectedBranchId) return;
        }
        const repId = String(order.salesRepId || '').trim();
        if (!repId) return;
        nextSales[repId] = Number(nextSales[repId] || 0) + Number(order.price || 0);
      });
      setMonthlySalesByRep(nextSales);
    } catch (err: any) {
      setError(err?.message || 'Unable to load team');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, token]);

  useFocusEffect(
    useCallback(() => {
      loadTeam();
    }, [loadTeam]),
  );

  const scopedEmployees = useMemo(() => {
    if (!selectedBranchId) return employees;
    return employees.filter((emp) => String(emp.branch?.id || '').trim() === selectedBranchId);
  }, [employees, selectedBranchId]);

  const managers = useMemo<ManagerRow[]>(() => {
    const currentMonth = toMonthKey(new Date().toISOString());
    const managerMap = new Map<string, ManagerRow>();

    const managerEmployees = scopedEmployees.filter((row) => row.role === 'BRANCH_MANAGER');
    managerEmployees.forEach((employee) => {
      const managerName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || employee.email;
      const branchName = String(employee.branch?.name || selectedBranchName || 'Branch').trim();
      managerMap.set(employee.id, {
        id: employee.id,
        name: managerName,
        subtitle: `${branchName} - Manager`,
        sales: 0,
        status: 'Active',
        employee,
      });
    });

    orders.forEach((row) => {
      if (toMonthKey(row.createdAt) !== currentMonth) return;
      const order = row as Order & { branchId?: string | null };
      if (selectedBranchId && String(order.branchId || '').trim() !== selectedBranchId) return;

      const managerName = String(order.branchManagerName || '').trim();
      if (!managerName) return;
      for (const [key, rowValue] of managerMap.entries()) {
        if (rowValue.name.trim().toLowerCase() === managerName.toLowerCase()) {
          rowValue.sales += Number(order.price || 0);
          managerMap.set(key, rowValue);
          break;
        }
      }
    });

    return Array.from(managerMap.values()).sort((a, b) => b.sales - a.sales);
  }, [orders, scopedEmployees, selectedBranchId, selectedBranchName]);

  const reps = useMemo<RepRow[]>(() => {
    return [...scopedEmployees]
      .filter((emp) => emp.role === 'SALES_REP')
      .map((emp) => {
        const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email;
        const branchName = String(emp.branch?.name || selectedBranchName || 'Branch').trim();
        const sales = Number(monthlySalesByRep[emp.id] || 0);
        let status: RepRow['status'] = 'Away';
        if (!emp.isActive || sales < 20000) status = 'Low';
        else if (emp.isOnline) status = 'Online';
        return {
          id: emp.id,
          name,
          subtitle: `${branchName} - Rep`,
          sales,
          status,
          employee: emp,
        };
      })
      .sort((a, b) => b.sales - a.sales);
  }, [monthlySalesByRep, scopedEmployees, selectedBranchName]);

  const allCount = managers.length + reps.length;
  const headerTitle = isCompanyAdmin ? `Team (${allCount})` : `${selectedBranchName ? `${selectedBranchName} Team` : 'My Team'} (${reps.length})`;

  const goBack = useCallback(() => {
    if (user?.role === 'COMPANY_ADMIN' && selectedBranchId) {
      navigation.navigate('BranchesHome');
      return;
    }
    if (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') {
      (navigation as any).navigate('DashboardTab');
      return;
    }
    navigation.goBack();
  }, [navigation, selectedBranchId, user?.role]);

  const renderStatusPill = (status: string) => (
    <View
      style={[
        styles.statusPill,
        status === 'Active' || status === 'Online'
          ? styles.statusPillOnline
          : status === 'Low'
            ? styles.statusPillLow
            : styles.statusPillAway,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          status === 'Active' || status === 'Online'
            ? styles.statusTextOnline
            : status === 'Low'
              ? styles.statusTextLow
              : styles.statusTextAway,
        ]}
      >
        {status}
      </Text>
    </View>
  );

  if (!isCompanyAdmin) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={18} color="#8A8279" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.inviteBtn}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('BranchEmployeeForm', { mode: 'create' })}
          >
            <Text style={styles.inviteBtnText}>+ Invite</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <FlatList
          data={reps}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.legacyListContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadTeam}
          renderItem={({ item }) => {
            const initial = (item.employee.firstName?.[0] || item.employee.email?.[0] || 'R').toUpperCase();
            return (
              <TouchableOpacity
                style={styles.legacyCard}
                activeOpacity={0.92}
                onPress={() => navigation.navigate('BranchRepProfile', { employee: item.employee })}
              >
                <View style={[styles.legacyAvatar, item.status === 'Online' ? styles.legacyAvatarOnline : styles.legacyAvatarOffline]}>
                  {item.employee.photoUrl ? (
                    <Image source={{ uri: item.employee.photoUrl }} style={styles.legacyAvatarImage} />
                  ) : (
                    <Text style={[styles.legacyAvatarText, item.status === 'Online' ? styles.legacyAvatarTextOnline : styles.legacyAvatarTextOffline]}>
                      {initial}
                    </Text>
                  )}
                </View>
                <View style={styles.legacyInfoBlock}>
                  <Text style={styles.legacyRepName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.legacyRepMeta} numberOfLines={1}>{formatCompactMoney(item.sales)} this month</Text>
                </View>
                {renderStatusPill(item.status)}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="people-outline" size={24} color="#B9AFA3" />
              <Text style={styles.emptyText}>No reps found</Text>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={18} color="#8A8279" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.inviteBtn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('BranchEmployeeForm', { mode: 'create' })}
        >
          <Text style={styles.inviteBtnText}>+ Invite</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'ALL' ? styles.filterChipActive : null]}
            activeOpacity={0.88}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[styles.filterChipText, filter === 'ALL' ? styles.filterChipTextActive : null]}>
              All({allCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'MANAGERS' ? styles.filterChipActive : null]}
            activeOpacity={0.88}
            onPress={() => setFilter('MANAGERS')}
          >
            <Text style={[styles.filterChipText, filter === 'MANAGERS' ? styles.filterChipTextActive : null]}>
              Managers ({managers.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'REPS' ? styles.filterChipActive : null]}
            activeOpacity={0.88}
            onPress={() => setFilter('REPS')}
          >
            <Text style={[styles.filterChipText, filter === 'REPS' ? styles.filterChipTextActive : null]}>
              Reps ({reps.length})
            </Text>
          </TouchableOpacity>
        </View>

        {(filter === 'ALL' || filter === 'MANAGERS') ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BRANCH MANAGERS</Text>
            {managers.length ? (
              managers.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.teamCard}
                  activeOpacity={0.92}
                  onPress={() => {
                    if (item.employee) {
                      navigation.navigate('BranchRepProfile', { employee: item.employee });
                    }
                  }}
                >
                  <View style={styles.leftAvatarWrap}>
                    <View style={[styles.initialAvatar, styles.initialAvatarManager]}>
                      <Text style={styles.initialAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.rightInfo}>
                    <Text style={styles.salesText}>{formatCompactMoney(item.sales)}</Text>
                    {renderStatusPill(item.status)}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyInline}>No managers found</Text>
            )}
          </View>
        ) : null}

        {(filter === 'ALL' || filter === 'REPS') ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SALES REPS</Text>
            {reps.length ? (
              reps.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.teamCard}
                  activeOpacity={0.92}
                  onPress={() => navigation.navigate('BranchRepProfile', { employee: item.employee })}
                >
                  <View style={styles.leftAvatarWrap}>
                    <View style={[styles.initialAvatar, item.status === 'Low' ? styles.initialAvatarLow : styles.initialAvatarRep]}>
                      <Text style={[styles.initialAvatarText, item.status === 'Low' ? styles.initialAvatarTextLow : null]}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.rightInfo}>
                    <Text style={styles.salesText}>{formatCompactMoney(item.sales)}</Text>
                    {renderStatusPill(item.status)}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyInline}>No reps found</Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  headerRow: {
    height: 46,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE4DC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { marginRight: 4, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, color: '#1F1A15', fontWeight: '700' },
  inviteBtn: {
    height: 28,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#1A1715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  errorText: { marginHorizontal: 14, marginTop: 8, color: '#B14B42', fontSize: 12 },
  content: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16 },
  filtersRow: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  filterChip: {
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDD6CD',
    backgroundColor: '#F7F5F2',
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: '#171411', borderColor: '#171411' },
  filterChipText: { fontSize: 11, color: '#7E756C', fontWeight: '700' },
  filterChipTextActive: { color: '#FFFFFF' },
  section: { marginBottom: 10 },
  sectionLabel: { fontSize: 10, letterSpacing: 1, color: '#8F867D', fontWeight: '700', marginBottom: 6 },
  teamCard: {
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  leftAvatarWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  initialAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  initialAvatarManager: { backgroundColor: '#1C1815' },
  initialAvatarRep: { backgroundColor: '#EAF4EE' },
  initialAvatarLow: { backgroundColor: '#F1EFEC' },
  initialAvatarText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  initialAvatarTextLow: { color: '#8A8178' },
  cardInfo: { marginLeft: 10, flex: 1 },
  cardName: { fontSize: 16, lineHeight: 18, color: '#231E1A', fontWeight: '700' },
  cardSubtitle: { marginTop: 2, fontSize: 11, lineHeight: 13, color: '#8A8178', fontWeight: '500' },
  rightInfo: { alignItems: 'flex-end' },
  salesText: { fontSize: 16, lineHeight: 18, color: '#A27A3D', fontWeight: '700', marginBottom: 5 },
  statusPill: {
    minWidth: 58,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusPillOnline: { backgroundColor: '#E8F4ED', borderColor: '#B9DCC5' },
  statusPillAway: { backgroundColor: '#F4F2EF', borderColor: '#E0DAD0' },
  statusPillLow: { backgroundColor: '#F4F2EF', borderColor: '#E0DAD0' },
  statusText: { fontSize: 10, fontWeight: '700' },
  statusTextOnline: { color: '#3E8358' },
  statusTextAway: { color: '#8A8178' },
  statusTextLow: { color: '#2B2722' },
  emptyInline: { fontSize: 12, color: '#8A8178', paddingVertical: 8, paddingHorizontal: 4 },

  legacyListContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16, gap: 10 },
  legacyCard: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  legacyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  legacyAvatarOnline: { backgroundColor: '#E7F2EA' },
  legacyAvatarOffline: { backgroundColor: '#F4EAEA' },
  legacyAvatarImage: { width: '100%', height: '100%' },
  legacyAvatarText: { fontSize: 18, fontWeight: '700' },
  legacyAvatarTextOnline: { color: '#4E7E62' },
  legacyAvatarTextOffline: { color: '#A57272' },
  legacyInfoBlock: { flex: 1, marginLeft: 12, marginRight: 10 },
  legacyRepName: { fontSize: 16, lineHeight: 19, color: '#221D18', fontWeight: '700' },
  legacyRepMeta: { marginTop: 1, fontSize: 12, color: '#8A8178', fontWeight: '500' },

  emptyWrap: { marginTop: 22, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 6, fontSize: 14, color: '#8A8178', fontWeight: '600' },
});

export default BranchTeamScreen;
