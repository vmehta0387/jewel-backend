import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Screen from '../components/Screen';
import Card from '../components/Card';
import Button from '../components/Button';
import ScreenHeader from '../components/ScreenHeader';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import {
  createBranchEmployee,
  fetchBranchEmployeeBranches,
  fetchBranchEmployees,
  updateBranchEmployee,
  updateBranchEmployeeStatus,
} from '../api/branchEmployees';
import type { BranchEmployee, BranchOption } from '../types';
import type { TeamStackParamList } from '../navigation/RootNavigator';

const BranchEmployeeFormScreen = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<TeamStackParamList>>();
  const route = useRoute<RouteProp<TeamStackParamList, 'BranchEmployeeForm'>>();
  const isEdit = route.params.mode === 'edit';
  const employeeId = isEdit ? route.params.employeeId : null;

  const [employee, setEmployee] = useState<BranchEmployee | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';

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

  const loadEmployee = useCallback(async () => {
    if (!token || !employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBranchEmployees(token);
      const found = data.find((item) => item.id === employeeId);
      if (found) {
        setEmployee(found);
        setForm({
          email: found.email,
          password: '',
          firstName: found.firstName || '',
          lastName: found.lastName || '',
          phone: found.phone || '',
        });
        if (found.branch?.id) {
          setSelectedBranchId(found.branch.id);
        }
      } else {
        setError('Employee not found.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load employee');
    } finally {
      setLoading(false);
    }
  }, [employeeId, token]);

  useFocusEffect(
    useCallback(() => {
      loadBranches();
      if (isEdit) {
        loadEmployee();
      }
    }, [isEdit, loadBranches, loadEmployee]),
  );

  const canSubmit = useMemo(() => {
    if (!form.firstName || !form.lastName) return false;
    if (!isEdit && (!form.email || !form.password)) return false;
    if (!isEdit && isCompanyAdmin && !selectedBranchId) return false;
    return true;
  }, [form, isEdit, isCompanyAdmin, selectedBranchId]);

  const handleSave = async () => {
    if (!token) return;
    if (!canSubmit) {
      setError('Please fill all required fields.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEdit && employeeId) {
        await updateBranchEmployee(token, employeeId, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
        });
      } else {
        await createBranchEmployee(token, {
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          branchId: isCompanyAdmin ? selectedBranchId : undefined,
        });
      }
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message || 'Unable to save employee');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!token || !employeeId || !employee) return;
    setLoading(true);
    setError(null);
    try {
      await updateBranchEmployeeStatus(token, employeeId, !employee.isActive);
      setEmployee({ ...employee, isActive: !employee.isActive });
    } catch (err: any) {
      setError(err?.message || 'Unable to update status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={isEdit ? 'Edit Employee' : 'Add Employee'}
        subtitle={isEdit ? employee?.email : 'Create a new branch employee'}
        rightSlot={<Button title="Close" variant="ghost" onPress={() => navigation.goBack()} style={styles.closeBtn} />}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card>
          <Text style={styles.sectionTitle}>Employee Details</Text>

          {isCompanyAdmin && !isEdit ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Branch</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={selectedBranchId} onValueChange={setSelectedBranchId}>
                  {branches.map((branch) => (
                    <Picker.Item key={branch.id} label={`${branch.name} (${branch.code})`} value={branch.id} />
                  ))}
                </Picker>
              </View>
            </View>
          ) : null}

          {isCompanyAdmin && isEdit && employee?.branch?.name ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Branch</Text>
              <Text style={styles.readOnlyValue}>{employee.branch.name}</Text>
            </View>
          ) : null}

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.input, isEdit ? styles.inputDisabled : null]}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={form.email}
              onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
              autoCapitalize="none"
              editable={!isEdit}
              underlineColorAndroid="transparent"
              autoCorrect={false}
              textAlignVertical="center"
            />
          </View>

          {!isEdit ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={form.password}
                onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                secureTextEntry
                underlineColorAndroid="transparent"
                textAlignVertical="center"
              />
            </View>
          ) : null}

          <View style={styles.row}>
            <View style={[styles.fieldBlock, styles.half]}>
              <Text style={styles.fieldLabel}>First name</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={colors.textMuted}
                value={form.firstName}
                onChangeText={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
                underlineColorAndroid="transparent"
                textAlignVertical="center"
              />
            </View>
            <View style={[styles.fieldBlock, styles.half]}>
              <Text style={styles.fieldLabel}>Last name</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor={colors.textMuted}
                value={form.lastName}
                onChangeText={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
                underlineColorAndroid="transparent"
                textAlignVertical="center"
              />
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone"
              placeholderTextColor={colors.textMuted}
              value={form.phone}
              onChangeText={(value) => setForm((prev) => ({ ...prev, phone: value }))}
              keyboardType="phone-pad"
              underlineColorAndroid="transparent"
              textAlignVertical="center"
            />
          </View>

          <Button title={loading ? 'Saving...' : 'Save'} onPress={handleSave} disabled={!canSubmit || loading} />

          {isEdit && employee ? (
            <View style={styles.toggleRow}>
              <Button
                title={employee.isActive ? 'Disable Employee' : 'Enable Employee'}
                variant={employee.isActive ? 'ghost' : 'secondary'}
                onPress={handleToggle}
                disabled={loading}
              />
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  closeBtn: {
    minWidth: 78,
    paddingVertical: 8,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  fieldBlock: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
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
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: '#fff',
    color: colors.text,
    includeFontPadding: false,
  },
  inputDisabled: {
    backgroundColor: colors.background,
    color: colors.textMuted,
  },
  readOnlyValue: {
    paddingVertical: spacing.xs,
    color: colors.text,
    fontWeight: '600',
  },
  toggleRow: {
    marginTop: spacing.sm,
  },
});

export default BranchEmployeeFormScreen;
