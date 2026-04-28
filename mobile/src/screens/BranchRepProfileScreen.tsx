import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import {
  fetchBranchEmployeeBranches,
  fetchBranchEmployees,
  updateBranchEmployee,
  updateBranchEmployeeStatus,
} from '../api/branchEmployees';
import { fetchOrders } from '../api/orders';
import { fetchSpiffConfig, fetchSpiffLeaderboard } from '../api/spiff';
import type { BranchEmployee, BranchOption, Order } from '../types';
import type { TeamStackParamList } from '../navigation/RootNavigator';

type RepProfileRoute = RouteProp<TeamStackParamList, 'BranchRepProfile'>;
type RepProfileNav = NativeStackNavigationProp<TeamStackParamList>;

type EditForm = {
  fullName: string;
  email: string;
  phone: string;
  branchId: string;
};

const monthKey = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (date: Date) => date.toLocaleDateString('en-US', { month: 'short' });

const formatCompactMoney = (value: number) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '$0';
  if (amount >= 1000) return `$${Math.round(amount / 1000)}k`;
  return `$${Math.round(amount)}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const trendPct = (current: number, previous: number) => {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const PLACED_STATUSES = new Set([
  'PENDING_APPROVAL',
  'APPROVED',
  'IN_PRODUCTION',
  'SHIPPED',
  'COMPLETED',
]);

const normalizeStatus = (value?: string | null) => String(value || '').trim().toUpperCase();

const statusPill = (status?: string | null) => {
  const key = normalizeStatus(status);
  if (key === 'APPROVED') return { bg: '#E7F2EA', border: '#BFD9C8', text: '#2C7B4D', label: 'Approved' };
  if (key === 'IN_PRODUCTION') return { bg: '#EAF1FD', border: '#BFD2F1', text: '#3D6CAF', label: 'In Prod.' };
  if (key === 'SHIPPED' || key === 'COMPLETED') return { bg: '#ECE9F9', border: '#D1C8EE', text: '#6551A5', label: 'Shipped' };
  if (key === 'PENDING_APPROVAL') return { bg: '#F8F5F0', border: '#DCCFC0', text: '#2A221C', label: 'Pending' };
  return { bg: '#F6EFE6', border: '#E7D4B7', text: '#8C7048', label: 'Quote' };
};

const splitName = (fullName: string) => {
  const clean = fullName.trim().replace(/\s+/g, ' ');
  if (!clean) return { firstName: '', lastName: '' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const BranchRepProfileScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation<RepProfileNav>();
  const route = useRoute<RepProfileRoute>();

  const [employee, setEmployee] = useState<BranchEmployee>(route.params.employee);
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [spiffEarned, setSpiffEarned] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editNotice, setEditNotice] = useState<string | null>(null);
  const [branchPickerVisible, setBranchPickerVisible] = useState(false);
  const [form, setForm] = useState<EditForm>({
    fullName: '',
    email: '',
    phone: '',
    branchId: '',
  });

  const hydrateForm = useCallback((value: BranchEmployee) => {
    const fullName = `${value.firstName || ''} ${value.lastName || ''}`.trim() || value.email;
    setForm({
      fullName,
      email: value.email || '',
      phone: value.phone || '',
      branchId: value.branch?.id || '',
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [employeesRes, ordersRes, spiffConfigRes, spiffBoardRes, branchesRes] = await Promise.all([
        fetchBranchEmployees(token),
        fetchOrders(token, 1, 100, 'ALL'),
        fetchSpiffConfig(token),
        fetchSpiffLeaderboard(token, { scope: 'MY_BRANCH', period: 'MONTHLY', limit: 100 }),
        fetchBranchEmployeeBranches(token),
      ]);

      setBranches(branchesRes || []);
      const freshEmployee = (employeesRes || []).find((row) => row.id === route.params.employee.id);
      const nextEmployee = freshEmployee || employee;
      setEmployee(nextEmployee);
      if (!editMode) {
        hydrateForm(nextEmployee);
      }

      const repOrders = (ordersRes.data || [])
        .filter((order) => String(order.salesRepId || '').trim() === route.params.employee.id)
        .filter((order) => order.isActive !== false)
        .sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
      setOrders(repOrders);

      const pointsPerDollar = Number(spiffConfigRes?.pointsPerDollar || 100);
      const row = (spiffBoardRes?.entries || []).find((entry) => entry.entityId === route.params.employee.id);
      const points = Number(row?.points || 0);
      const earned = pointsPerDollar > 0 ? points / pointsPerDollar : 0;
      setSpiffEarned(Number.isFinite(earned) ? earned : 0);
    } catch (err: any) {
      setError(err?.message || 'Unable to load rep details');
    } finally {
      setLoading(false);
    }
  }, [editMode, employee, hydrateForm, route.params.employee.id, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const monthly = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    let sales = 0;
    let ordersCount = 0;
    let prevSales = 0;
    let prevOrders = 0;

    orders.forEach((order) => {
      const key = monthKey(order.createdAt);
      const status = normalizeStatus(order.status);
      if (!PLACED_STATUSES.has(status)) return;

      if (key === currentMonth) {
        sales += Number(order.price || 0);
        ordersCount += 1;
      } else if (key === previousMonth) {
        prevSales += Number(order.price || 0);
        prevOrders += 1;
      }
    });

    return {
      sales,
      ordersCount,
      salesTrend: trendPct(sales, prevSales),
      orderTrend: trendPct(ordersCount, prevOrders),
    };
  }, [orders]);

  const last6Months = useMemo(() => {
    const now = new Date();
    const buckets: Array<{ key: string; label: string; value: number }> = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets.push({ key, label: monthLabel(d), value: 0 });
    }
    const byMonth = new Map(buckets.map((item) => [item.key, item]));
    orders.forEach((order) => {
      const status = normalizeStatus(order.status);
      if (!PLACED_STATUSES.has(status)) return;
      const key = monthKey(order.createdAt);
      const hit = byMonth.get(key);
      if (hit) hit.value += Number(order.price || 0);
    });
    return buckets;
  }, [orders]);

  const maxRevenue = useMemo(() => Math.max(...last6Months.map((row) => row.value), 1), [last6Months]);
  const recentOrders = useMemo(
    () => orders.filter((order) => PLACED_STATUSES.has(normalizeStatus(order.status))).slice(0, 3),
    [orders],
  );

  const selectedBranchName = useMemo(() => {
    const hit = branches.find((branch) => branch.id === form.branchId);
    return hit?.name || employee.branch?.name || '-';
  }, [branches, employee.branch?.name, form.branchId]);

  const isOnline = Boolean(employee.isActive && employee.isOnline);
  const initial = (employee.firstName?.[0] || employee.email?.[0] || 'R').toUpperCase();
  const subtitle = `Sales Associate \u2022 ${selectedBranchName || 'Branch'}`;

  const handleEditMode = useCallback(() => {
    setEditMode(true);
    setEditNotice('Edit mode on');
    setTimeout(() => {
      setEditNotice((prev) => (prev === 'Edit mode on' ? null : prev));
    }, 1800);
  }, []);

  const handleSaveChanges = useCallback(async () => {
    if (!token || !editMode) return;
    const email = form.email.trim();
    const branchId = form.branchId.trim();
    if (!email) {
      Alert.alert('Missing email', 'Email is required.');
      return;
    }
    if (!branchId) {
      Alert.alert('Missing branch', 'Please select a branch.');
      return;
    }

    const { firstName, lastName } = splitName(form.fullName);
    if (!firstName || !lastName) {
      Alert.alert('Missing name', 'Please enter a valid full name.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateBranchEmployee(token, employee.id, {
        firstName,
        lastName,
        email,
        phone: form.phone.trim() || undefined,
        branchId,
      });
      setEmployee(updated);
      hydrateForm(updated);
      setEditMode(false);
      setEditNotice('Saved');
      setTimeout(() => {
        setEditNotice((prev) => (prev === 'Saved' ? null : prev));
      }, 1600);
    } catch (err: any) {
      setError(err?.message || 'Unable to save changes');
    } finally {
      setSaving(false);
    }
  }, [editMode, employee.id, form, hydrateForm, token]);

  const toggleSuspend = useCallback(async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const nextActive = !employee.isActive;
      await updateBranchEmployeeStatus(token, employee.id, nextActive);
      setEmployee((prev) => ({ ...prev, isActive: nextActive }));
      Alert.alert(nextActive ? 'Enabled' : 'Suspended', nextActive ? 'Rep is now active.' : 'Rep has been suspended.');
    } catch (err: any) {
      setError(err?.message || 'Unable to update rep status');
    } finally {
      setSaving(false);
    }
  }, [employee.id, employee.isActive, token]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={18} color="#8A8178" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rep Profile</Text>
        <TouchableOpacity style={styles.editBtn} activeOpacity={0.9} onPress={handleEditMode}>
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {editNotice ? <Text style={styles.noticeText}>{editNotice}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          {employee.photoUrl ? (
            <Image source={{ uri: employee.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initial}</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{form.fullName || employee.email}</Text>
            <Text style={styles.profileSub}>{subtitle}</Text>
            <View style={styles.tagRow}>
              <View style={[styles.tagPill, isOnline ? styles.tagOnline : styles.tagOffline]}>
                <Text style={[styles.tagText, isOnline ? styles.tagTextOnline : styles.tagTextOffline]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
              <View style={[styles.tagPill, styles.tagRole]}>
                <Text style={[styles.tagText, styles.tagRoleText]}>Rep</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contact info</Text>
        <View style={styles.contactCard}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            {editMode ? (
              <TextInput
                style={styles.fieldInput}
                value={form.fullName}
                onChangeText={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
                placeholder="Full name"
                placeholderTextColor="#A79D92"
              />
            ) : (
              <View style={styles.fieldBox}><Text style={styles.fieldText}>{form.fullName || '-'}</Text></View>
            )}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            {editMode ? (
              <TextInput
                style={styles.fieldInput}
                value={form.email}
                onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                placeholder="Email"
                placeholderTextColor="#A79D92"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            ) : (
              <View style={styles.fieldBox}><Text style={styles.fieldText}>{form.email || '-'}</Text></View>
            )}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>PHONE</Text>
            {editMode ? (
              <TextInput
                style={styles.fieldInput}
                value={form.phone}
                onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                placeholder="Phone"
                placeholderTextColor="#A79D92"
                keyboardType="phone-pad"
              />
            ) : (
              <View style={styles.fieldBox}><Text style={styles.fieldText}>{form.phone || '-'}</Text></View>
            )}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>BRANCH</Text>
            {editMode ? (
              <TouchableOpacity style={styles.fieldBox} activeOpacity={0.9} onPress={() => setBranchPickerVisible(true)}>
                <Text style={styles.fieldText}>{selectedBranchName}</Text>
                <Ionicons name="chevron-down" size={16} color="#8A8178" />
              </TouchableOpacity>
            ) : (
              <View style={styles.fieldBox}><Text style={styles.fieldText}>{selectedBranchName}</Text></View>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>This month</Text>
        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>SALES</Text>
            <Text style={styles.statValue}>{formatCompactMoney(monthly.sales)}</Text>
            <Text style={styles.statTrend}>+ {monthly.salesTrend}%</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statLabel}>ORDERS</Text>
            <Text style={styles.statValue}>{monthly.ordersCount}</Text>
            <Text style={styles.statTrend}>+ {monthly.orderTrend}%</Text>
          </View>
          <View style={[styles.statTile, styles.statTileSpiff]}>
            <Text style={styles.statLabelSpiff}>SPIFF</Text>
            <Text style={styles.statValueSpiff}>{formatCompactMoney(spiffEarned)}</Text>
            <Text style={styles.statSubSpiff}>earned</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Revenue (last 6 months)</Text>
        <View style={styles.chartCard}>
          <View style={styles.chartBarsRow}>
            {last6Months.map((item) => (
              <View key={item.key} style={styles.chartBarWrap}>
                <View style={styles.chartTrack}>
                  <View
                    style={[
                      styles.chartFill,
                      { height: `${Math.max(6, (item.value / maxRevenue) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.chartMonth}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent orders</Text>
        <View style={styles.recentCard}>
          {recentOrders.length ? (
            recentOrders.map((order, index) => {
              const pill = statusPill(order.status);
              return (
                <View key={order.id} style={[styles.recentRow, index < recentOrders.length - 1 ? styles.recentDivider : null]}>
                  <View style={styles.recentLeft}>
                    <Text style={styles.recentTitle} numberOfLines={1}>{order.designNo || order.orderNumber}</Text>
                    <Text style={styles.recentMeta} numberOfLines={1}>
                      {order.customerName || '-'} - PO: {order.purchaseOrderNumber || order.orderNumber}
                    </Text>
                  </View>
                  <View style={styles.recentRight}>
                    <Text style={styles.recentPrice}>{formatCurrency(Number(order.price || 0))}</Text>
                    <View style={[styles.recentStatusPill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
                      <Text style={[styles.recentStatusText, { color: pill.text }]}>{pill.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyRecentText}>No recent orders</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.suspendBtn, saving ? styles.btnDisabled : null]}
          onPress={toggleSuspend}
          activeOpacity={0.9}
          disabled={saving}
        >
          <Text style={styles.suspendText}>{employee.isActive ? 'Suspend' : 'Enable'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, (!editMode || saving || loading) ? styles.btnDisabled : null]}
          onPress={handleSaveChanges}
          activeOpacity={0.9}
          disabled={!editMode || saving || loading}
        >
          <Text style={styles.saveText}>Save Changes -&gt;</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={branchPickerVisible} transparent animationType="fade" onRequestClose={() => setBranchPickerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setBranchPickerVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.branchModal}>
                <Text style={styles.branchModalTitle}>Select Branch</Text>
                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  {branches.map((branch) => (
                    <TouchableOpacity
                      key={branch.id}
                      style={[styles.branchRow, form.branchId === branch.id ? styles.branchRowSelected : null]}
                      onPress={() => {
                        setForm((prev) => ({ ...prev, branchId: branch.id }));
                        setBranchPickerVisible(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.branchRowText, form.branchId === branch.id ? styles.branchRowTextSelected : null]}>
                        {branch.name}
                      </Text>
                      {form.branchId === branch.id ? <Ionicons name="checkmark" size={15} color="#2F8A58" /> : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  headerRow: {
    height: 54,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E3DA',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBack: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#4A433B' },
  editBtn: {
    minWidth: 52,
    height: 32,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#DDD3C7',
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  editBtnText: { fontSize: 13, fontWeight: '700', color: '#8A7C6B' },
  noticeText: {
    marginHorizontal: 14,
    marginTop: 6,
    fontSize: 12,
    color: '#2F8A58',
    fontWeight: '700',
  },
  errorText: {
    marginHorizontal: 14,
    marginTop: 6,
    color: '#B14B42',
    fontSize: 12,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 120,
  },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E8DFD3',
    backgroundColor: '#FFFFFF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#B2874A',
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFE7DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8D7658',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A241F',
  },
  profileSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#8A8178',
    fontWeight: '500',
  },
  tagRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  tagPill: {
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagOnline: { backgroundColor: '#E9F5EC', borderColor: '#B8D8C0' },
  tagOffline: { backgroundColor: '#F7EFEF', borderColor: '#E4CBCB' },
  tagRole: { backgroundColor: '#F5F2EE', borderColor: '#DED4C8' },
  tagText: { fontSize: 12, fontWeight: '700' },
  tagTextOnline: { color: '#3C7F55' },
  tagTextOffline: { color: '#A25E5E' },
  tagRoleText: { color: '#7B7268' },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1A16',
  },
  contactCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E8DFD3',
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldWrap: { marginBottom: 9 },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 0.9,
    color: '#9A9188',
    fontWeight: '700',
    marginBottom: 4,
  },
  fieldBox: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD3C7',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CDBFAF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#2D261F',
    fontWeight: '500',
  },
  fieldText: {
    fontSize: 14,
    color: '#2D261F',
    fontWeight: '500',
    flexShrink: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E8DFD3',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  statTileSpiff: {
    backgroundColor: '#F9F4EB',
    borderColor: '#E7D4B7',
  },
  statLabel: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: '#9A9188',
    fontWeight: '700',
  },
  statValue: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 14,
    color: '#1E1A16',
    fontWeight: '800',
  },
  statTrend: {
    marginTop: 1,
    fontSize: 9,
    color: '#2F8A58',
    fontWeight: '700',
  },
  statLabelSpiff: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: '#A27A3D',
    fontWeight: '700',
  },
  statValueSpiff: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 14,
    color: '#9C783D',
    fontWeight: '800',
  },
  statSubSpiff: {
    marginTop: 1,
    fontSize: 9,
    color: '#A27A3D',
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E8DFD3',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartBarsRow: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartBarWrap: {
    width: 34,
    alignItems: 'center',
  },
  chartTrack: {
    width: 18,
    height: 90,
    borderRadius: 9,
    backgroundColor: '#F1ECE5',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartFill: {
    width: '100%',
    backgroundColor: '#B2874A',
    borderRadius: 9,
    minHeight: 4,
  },
  chartMonth: {
    marginTop: 7,
    fontSize: 11,
    color: '#8A8178',
    fontWeight: '600',
  },
  recentCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E8DFD3',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#2C1E16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recentRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EAE4DC',
  },
  recentLeft: { flex: 1, marginRight: 8 },
  recentTitle: { fontSize: 16, fontWeight: '700', color: '#26201B' },
  recentMeta: { marginTop: 1, fontSize: 12, color: '#867C72', fontWeight: '500' },
  recentRight: { alignItems: 'flex-end' },
  recentPrice: { fontSize: 16, color: '#B2874A', fontWeight: '800' },
  recentStatusPill: {
    marginTop: 3,
    minHeight: 24,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentStatusText: { fontSize: 12, fontWeight: '700' },
  emptyRecentText: { fontSize: 13, color: '#8A8178', paddingVertical: 12, textAlign: 'center' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#E8E1D7',
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  suspendBtn: {
    width: 110,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7C2C2',
    backgroundColor: '#FDF1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suspendText: { color: '#C34F4F', fontSize: 13, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A1715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  btnDisabled: { opacity: 0.45 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.24)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  branchModal: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DFD3',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  branchModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D261F',
    marginBottom: 8,
  },
  branchRow: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E9E1D7',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 10,
    marginBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branchRowSelected: {
    borderColor: '#BFD9C8',
    backgroundColor: '#EDF7F0',
  },
  branchRowText: {
    fontSize: 13,
    color: '#4A433B',
    fontWeight: '500',
  },
  branchRowTextSelected: {
    color: '#2F8A58',
    fontWeight: '700',
  },
});

export default BranchRepProfileScreen;
