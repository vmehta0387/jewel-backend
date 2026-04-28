import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { fetchBranchEmployees } from '../api/branchEmployees';
import { fetchOrders } from '../api/orders';
import type { BranchEmployee } from '../types';
import type { TeamStackParamList } from '../navigation/RootNavigator';

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
  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
  const [monthlySalesByRep, setMonthlySalesByRep] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [employeeRows, ordersRes] = await Promise.all([
        fetchBranchEmployees(token),
        fetchOrders(token, 1, 100, 'ALL'),
      ]);
      setEmployees(employeeRows || []);

      const currentMonth = toMonthKey(new Date().toISOString());
      const nextSales: Record<string, number> = {};
      (ordersRes.data || []).forEach((order) => {
        if (toMonthKey(order.createdAt) !== currentMonth) return;
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
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadTeam();
    }, [loadTeam]),
  );

  const rows = useMemo(() => {
    return [...employees].sort((a, b) => {
      const aOnline = a.isActive && a.isOnline;
      const bOnline = b.isActive && b.isOnline;
      if (aOnline !== bOnline) return bOnline ? 1 : -1;
      const aSales = Number(monthlySalesByRep[a.id] || 0);
      const bSales = Number(monthlySalesByRep[b.id] || 0);
      if (aSales !== bSales) return bSales - aSales;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
  }, [employees, monthlySalesByRep]);

  const goBackToDashboard = useCallback(() => {
    if (user?.role === 'BRANCH_MANAGER' || user?.role === 'SALES_REP') {
      (navigation as any).navigate('DashboardTab');
      return;
    }
    navigation.goBack();
  }, [navigation, user?.role]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={goBackToDashboard}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color="#8A8279" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Team ({rows.length} reps)</Text>
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
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadTeam}
        renderItem={({ item }) => {
          const name = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email;
          const initial = (item.firstName?.[0] || item.email?.[0] || 'R').toUpperCase();
          const monthlySales = Number(monthlySalesByRep[item.id] || 0);
          const subtitle =
            monthlySales > 0
              ? `${formatCompactMoney(monthlySales)} this month`
              : 'No sales this month';
          const isOnline = Boolean(item.isActive && item.isOnline);

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => navigation.navigate('BranchRepProfile', { employee: item })}
            >
              <View style={[styles.avatar, isOnline ? styles.avatarOnline : styles.avatarOffline]}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, isOnline ? styles.avatarTextOnline : styles.avatarTextOffline]}>{initial}</Text>
                )}
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.repName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.repMeta} numberOfLines={1}>
                  {subtitle}
                </Text>
              </View>
              <View style={[styles.statusPill, isOnline ? styles.statusPillOnline : styles.statusPillOffline]}>
                <Text style={[styles.statusPillText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
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
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    height: 46,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE4DC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: '#1F1A15',
    fontWeight: '700',
  },
  inviteBtn: {
    height: 28,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#1A1715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    marginHorizontal: 14,
    marginTop: 8,
    color: '#B14B42',
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 10,
  },
  card: {
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarOnline: {
    backgroundColor: '#E7F2EA',
  },
  avatarOffline: {
    backgroundColor: '#F4EAEA',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  avatarTextOnline: {
    color: '#4E7E62',
  },
  avatarTextOffline: {
    color: '#A57272',
  },
  infoBlock: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  repName: {
    fontSize: 16,
    lineHeight: 19,
    color: '#221D18',
    fontWeight: '700',
  },
  repMeta: {
    marginTop: 1,
    fontSize: 12,
    color: '#8A8178',
    fontWeight: '500',
  },
  statusPill: {
    minWidth: 58,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  statusPillOnline: {
    backgroundColor: '#E9F5EC',
    borderColor: '#B8D8C0',
  },
  statusPillOffline: {
    backgroundColor: '#F7EFEF',
    borderColor: '#E4CBCB',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextOnline: {
    color: '#3C7F55',
  },
  statusTextOffline: {
    color: '#A25E5E',
  },
  emptyWrap: {
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#8A8178',
    fontWeight: '600',
  },
});

export default BranchTeamScreen;
