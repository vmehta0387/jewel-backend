import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  createBranchEmployee,
  fetchBranchEmployees,
  fetchBranchEmployeeBranches,
  updateBranchEmployee,
  updateBranchEmployeeStatus,
} from '../api/branchEmployees';
import type { BranchEmployee, BranchOption } from '../types';

const BranchTeamScreen = () => {
  const { token, user } = useAuth();
  const [employees, setEmployees] = useState<BranchEmployee[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

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

  const loadBranches = useCallback(async () => {
    if (!token || !isCompanyAdmin) return;
    try {
      const data = await fetchBranchEmployeeBranches(token);
      setBranches(data || []);
      if (!selectedBranchId && data.length > 0) {
        setSelectedBranchId(data[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load branches');
    }
  }, [token, isCompanyAdmin, selectedBranchId]);

  useFocusEffect(
    useCallback(() => {
      loadEmployees();
      loadBranches();
    }, [loadEmployees, loadBranches]),
  );

  const canSubmit = useMemo(() => {
    if (!form.email || !form.password || !form.firstName || !form.lastName) {
      return false;
    }
    if (isCompanyAdmin && !selectedBranchId) {
      return false;
    }
    return true;
  }, [form, isCompanyAdmin, selectedBranchId]);

  const handleCreate = async () => {
    if (!token) return;
    if (!canSubmit) {
      setError('Email, password, names, and branch are required.');
      return;
    }
    setError(null);
    try {
      await createBranchEmployee(token, {
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        branchId: isCompanyAdmin ? selectedBranchId : undefined,
      });
      setForm({ email: '', password: '', firstName: '', lastName: '', phone: '' });
      await loadEmployees();
    } catch (err: any) {
      setError(err?.message || 'Unable to add employee');
    }
  };

  const handleToggle = async (employee: BranchEmployee) => {
    if (!token) return;
    try {
      await updateBranchEmployeeStatus(token, employee.id, !employee.isActive);
      await loadEmployees();
    } catch (err: any) {
      setError(err?.message || 'Unable to update status');
    }
  };

  const handleEdit = async (employee: BranchEmployee) => {
    if (!token) return;
    const current = employees.find((emp) => emp.id === employee.id) || employee;
    try {
      await updateBranchEmployee(token, employee.id, {
        firstName: current.firstName,
        lastName: current.lastName,
        phone: current.phone || undefined,
      });
      await loadEmployees();
    } catch (err: any) {
      setError(err?.message || 'Unable to update employee');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Branch Employees</Text>
        <Text style={styles.subtitle}>Add or manage sales reps in your branch.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>Add Employee</Text>
        {isCompanyAdmin ? (
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedBranchId} onValueChange={setSelectedBranchId}>
              {branches.map((branch) => (
                <Picker.Item key={branch.id} label={`${branch.name} (${branch.code})`} value={branch.id} />
              ))}
            </Picker>
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={form.email}
          onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={form.password}
          onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
          secureTextEntry
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="First name"
            placeholderTextColor={colors.textMuted}
            value={form.firstName}
            onChangeText={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
          />
          <TextInput
            style={[styles.input, styles.half]}
            placeholder="Last name"
            placeholderTextColor={colors.textMuted}
            value={form.lastName}
            onChangeText={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Phone (optional)"
          placeholderTextColor={colors.textMuted}
          value={form.phone}
          onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreate}>
          <Text style={styles.primaryButtonText}>Add Employee</Text>
        </TouchableOpacity>
      </Card>

      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadEmployees}
        renderItem={({ item }) => (
          <Card style={styles.employeeCard}>
            <View style={styles.employeeHeader}>
              <View>
                <Text style={styles.employeeName}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.employeeMeta}>{item.email}</Text>
                {item.branch?.name ? (
                  <Text style={styles.employeeMeta}>{item.branch.name}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => handleToggle(item)}>
                <Text style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={item.phone || ''}
              placeholder="Phone"
              placeholderTextColor={colors.textMuted}
              onChangeText={(value) =>
                setEmployees((prev) =>
                  prev.map((emp) => (emp.id === item.id ? { ...emp, phone: value } : emp)),
                )
              }
            />
            <TouchableOpacity style={styles.secondaryButton} onPress={() => handleEdit(item)}>
              <Text style={styles.secondaryButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </Card>
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
  formCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
    padding: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
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
    overflow: 'hidden',
    fontSize: 12,
  },
  badgeActive: {
    backgroundColor: '#E6F4EA',
    color: colors.success,
  },
  badgeInactive: {
    backgroundColor: '#FDE8E8',
    color: colors.danger,
  },
});

export default BranchTeamScreen;
