import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import StatCard from '../components/StatCard';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchBranchEmployees, updateBranchEmployeeStatus } from '../api/branchEmployees';
import type { BranchEmployee } from '../types';
import type { TeamStackParamList } from '../navigation/RootNavigator';

const BranchTeamScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<TeamStackParamList>>();
  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadEmployees = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBranchEmployees(token);
      setEmployees(data || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load employees');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadEmployees();
    }, [loadEmployees]),
  );

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) =>
      [employee.firstName, employee.lastName, employee.email, employee.branch?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [employees, search]);

  const stats = useMemo(() => {
    const active = employees.filter((employee) => employee.isActive).length;
    return { total: employees.length, active, inactive: employees.length - active };
  }, [employees]);

  const handleToggle = async (employee: BranchEmployee) => {
    if (!token) return;
    try {
      await updateBranchEmployeeStatus(token, employee.id, !employee.isActive);
      await loadEmployees();
    } catch (err: any) {
      setError(err?.message || 'Unable to update status');
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Team"
        subtitle="Manage branch employees and access"
        rightSlot={
          <Button
            title="Add Employee"
            variant="secondary"
            onPress={() => navigation.navigate('BranchEmployeeForm', { mode: 'create' })}
            style={styles.addEmployeeBtn}
          />
        }
      />

      <View style={styles.searchWrapper}>
        <View style={styles.searchShell}>
          <Ionicons name="search-outline" size={18} color="#a79687" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email"
            placeholderTextColor="#a79687"
            value={search}
            onChangeText={setSearch}
            underlineColorAndroid="transparent"
            autoCorrect={false}
            autoCapitalize="none"
            textAlignVertical="center"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#b2a294" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard label="Total" value={String(stats.total)} hint="Employees" />
          <StatCard label="Active" value={String(stats.active)} hint="Enabled" />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Inactive" value={String(stats.inactive)} hint="Disabled" />
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadEmployees}
        renderItem={({ item }) => (
          <Card style={styles.employeeCard}>
            <View style={styles.employeeHeader}>
              <View style={styles.employeeIdentity}>
                <View style={styles.identityRow}>
                  {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.employeeAvatar} />
                  ) : (
                    <View style={styles.employeeAvatarFallback}>
                      <Text style={styles.employeeAvatarFallbackText}>
                        {(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}
                      </Text>
                    </View>
                  )}
                  <View style={styles.identityText}>
                    <Text style={styles.employeeName}>{item.firstName} {item.lastName}</Text>
                    <Text style={styles.employeeMeta}>{item.email}</Text>
                    {item.branch?.name ? (
                      <Text style={styles.employeeMeta}>{item.branch.name}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
              <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
                <Text style={[styles.badgeText, item.isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Phone</Text>
              <Text style={styles.metaValue}>{item.phone || '-'}</Text>
            </View>

            <View style={styles.actionRow}>
              <Button
                title="Edit"
                variant="secondary"
                onPress={() => navigation.navigate('BranchEmployeeForm', { mode: 'edit', employeeId: item.id })}
                style={[styles.actionButton, styles.actionButtonFirst]}
              />
              <Button
                title={item.isActive ? 'Disable' : 'Enable'}
                variant={item.isActive ? 'ghost' : 'primary'}
                onPress={() => handleToggle(item)}
                style={styles.actionButton}
              />
            </View>
          </Card>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  addEmployeeBtn: {
    minWidth: 124,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  searchWrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#8B7355',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#2d221c',
    height: 40,
    backgroundColor: 'transparent',
    includeFontPadding: false,
    paddingVertical: 0,
  },
  statsGrid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  error: {
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  employeeCard: {
    marginBottom: spacing.md,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  employeeIdentity: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identityText: {
    flex: 1,
  },
  employeeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.border,
  },
  employeeAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EDE2D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeAvatarFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  employeeMeta: {
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: colors.success,
  },
  badgeTextInactive: {
    color: colors.danger,
  },
  badgeActive: {
    backgroundColor: '#E6F4EA',
  },
  badgeInactive: {
    backgroundColor: '#FDE8E8',
  },
  metaRow: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
  },
  actionButtonFirst: {
    marginRight: 0,
  },
});

export default BranchTeamScreen;
