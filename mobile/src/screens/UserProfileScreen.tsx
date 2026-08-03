import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import Screen from '../components/Screen';
import Card from '../components/Card';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';
import { deactivateMyAccount, updateMyProfile, uploadMyPhoto } from '../api/auth';
import { APP_VERSION } from '../config';

const formatRole = (role?: string) => {
  if (!role) return 'User';
  switch (role) {
    case 'SALES_REP':
      return 'Sales Associate';
    case 'BRANCH_MANAGER':
      return 'Branch Manager';
    case 'COMPANY_ADMIN':
      return 'Company Administrator';
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'INTERNAL_REP':
      return 'Internal Representative';
    default:
      return role.replace('_', ' ');
  }
};

const getErrorMessage = (e: any): string => {
  if (!e) return 'An unknown error occurred.';
  if (typeof e === 'string') return e;
  if (e.message) {
    return Array.isArray(e.message) ? e.message.join(', ') : String(e.message);
  }
  if (e.error) {
    return typeof e.error === 'string' ? e.error : JSON.stringify(e.error);
  }
  return JSON.stringify(e);
};

const StatusBanner = ({ status }: { status: { type: 'success' | 'error'; message: string } | null }) => {
  if (!status) return null;
  const isSuccess = status.type === 'success';
  return (
    <View style={[styles.statusBanner, isSuccess ? styles.statusSuccess : styles.statusError]}>
      <Ionicons
        name={isSuccess ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={16}
        color={isSuccess ? '#2E4A35' : '#8A3A3A'}
        style={{ marginRight: 8 }}
      />
      <Text style={[styles.statusText, isSuccess ? styles.statusTextSuccess : styles.statusTextError]}>
        {status.message}
      </Text>
    </View>
  );
};

const UserProfileScreen = () => {
  const { token, user, refresh, signOut } = useAuth();
  const navigation = useNavigation<any>();

  // Personal Details state
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Security state
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    password: '',
  });

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const [personalStatus, setPersonalStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [securityStatus, setSecurityStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initialize form values from Auth user
  const initForm = useCallback(() => {
    if (user) {
      setPersonalForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    initForm();
  }, [initForm]);

  // Check if personal details are modified
  const isPersonalDirty = useMemo(() => {
    if (!user) return false;
    return (
      personalForm.firstName.trim() !== (user.firstName || '') ||
      personalForm.lastName.trim() !== (user.lastName || '') ||
      personalForm.email.trim().toLowerCase() !== (user.email || '').toLowerCase() ||
      personalForm.phone.trim() !== (user.phone || '')
    );
  }, [personalForm, user]);

  // Check if security fields are modified
  const isSecurityDirty = useMemo(() => {
    return securityForm.password.trim().length > 0;
  }, [securityForm]);

  // Profile Photo Upload Handler
  const handlePickPhoto = async () => {
    if (!token) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access to upload a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      setUploadingPhoto(true);
      const updatedUser = await uploadMyPhoto(token, {
        uri: asset.uri,
        name: asset.fileName || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      await refresh(updatedUser);
      Alert.alert('Photo Updated', 'Your profile photo has been successfully updated.');
    } catch (e: any) {
      Alert.alert('Upload failed', getErrorMessage(e));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Profile Photo Remove Handler
  const handleRemovePhoto = async () => {
    if (!token) return;
    Alert.alert('Remove Photo', 'Are you sure you want to remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setUploadingPhoto(true);
          try {
            const updatedUser = await updateMyProfile(token, { photoUrl: null });
            await refresh(updatedUser);
            Alert.alert('Photo Removed', 'Your profile photo has been cleared.');
          } catch (e: any) {
            Alert.alert('Error', getErrorMessage(e));
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
    ]);
  };

  // Save Personal Details
  const handleSavePersonal = async () => {
    if (!token) return false;
    setPersonalStatus(null);
    const firstName = personalForm.firstName.trim();
    const lastName = personalForm.lastName.trim();
    const email = personalForm.email.trim();
    const phone = personalForm.phone.trim();

    if (!firstName || !lastName) {
      setPersonalStatus({ type: 'error', message: 'First name and last name are required.' });
      return false;
    }
    if (!email) {
      setPersonalStatus({ type: 'error', message: 'Email address is required.' });
      return false;
    }

    setSavingPersonal(true);
    try {
      const updatedUser = await updateMyProfile(token, {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
      });
      await refresh(updatedUser);
      setPersonalStatus({ type: 'success', message: 'Personal details updated successfully.' });
      setTimeout(() => setPersonalStatus(null), 4000);
      return true;
    } catch (e: any) {
      setPersonalStatus({ type: 'error', message: getErrorMessage(e) });
      initForm(); // revert changes
      return false;
    } finally {
      setSavingPersonal(false);
    }
  };

  // Save Security Details
  const handleSaveSecurity = async () => {
    if (!token) return false;
    setSecurityStatus(null);
    const { currentPassword, password } = securityForm;

    if (!currentPassword) {
      setSecurityStatus({ type: 'error', message: 'Please enter your current password to proceed.' });
      return false;
    }
    if (!password || password.length < 6) {
      setSecurityStatus({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return false;
    }

    setSavingSecurity(true);
    try {
      await updateMyProfile(token, {
        currentPassword,
        password,
      });
      setSecurityForm({ currentPassword: '', password: '' });
      setSecurityStatus({ type: 'success', message: 'Password changed successfully.' });
      setTimeout(() => setSecurityStatus(null), 4000);
      return true;
    } catch (e: any) {
      setSecurityStatus({ type: 'error', message: getErrorMessage(e) });
      return false;
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleDeleteAccount = useCallback(async () => {
    if (!token || deletingAccount) return;
    setDeletingAccount(true);
    try {
      await deactivateMyAccount(token);
      setDeleteConfirmVisible(false);
      await signOut({ clearBiometric: true });
    } catch (e: any) {
      Alert.alert('Unable to Delete Account', getErrorMessage(e));
    } finally {
      setDeletingAccount(false);
    }
  }, [deletingAccount, signOut, token]);

  const initial = (user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User Profile';
  const companyBranch = [user?.companyName, user?.branchName].filter(Boolean).join(' - ') || 'No branch assigned';

  return (
    <Screen>
      <ScreenHeader
        title="My Profile"
        subtitle="Manage your credentials and details"
        rightSlot={
          <View style={styles.headerActions}>
            <Button title="Close" variant="ghost" onPress={() => navigation.goBack()} style={styles.closeBtn} />
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {user?.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>{initial}</Text>
              </View>
            )}

            {/* Float loading indicator */}
            {uploadingPhoto && (
              <View style={styles.avatarLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>

          <View style={styles.avatarControls}>
            <TouchableOpacity style={styles.controlBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
              <Ionicons name="attach-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {user?.photoUrl ? (
              <TouchableOpacity style={[styles.controlBtn, styles.trashBtn]} onPress={handleRemovePhoto} disabled={uploadingPhoto}>
                <Ionicons name="trash-outline" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.avatarNameText}>{fullName}</Text>
          <Text style={styles.avatarBranchText}>{companyBranch}</Text>
        </View>

        {/* PERSONAL DETAILS CARD */}
        <Card style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>PERSONAL DETAILS</Text>
            {isPersonalDirty ? (
              <TouchableOpacity onPress={handleSavePersonal} disabled={savingPersonal} style={styles.cardSaveBtn}>
                {savingPersonal ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.cardSaveText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
          <StatusBanner status={personalStatus} />

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="First name"
              placeholderTextColor={colors.textMuted}
              value={personalForm.firstName}
              onChangeText={(val) => setPersonalForm((prev) => ({ ...prev, firstName: val }))}
              underlineColorAndroid="transparent"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Last name"
              placeholderTextColor={colors.textMuted}
              value={personalForm.lastName}
              onChangeText={(val) => setPersonalForm((prev) => ({ ...prev, lastName: val }))}
              underlineColorAndroid="transparent"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              value={personalForm.email}
              onChangeText={(val) => setPersonalForm((prev) => ({ ...prev, email: val }))}
              autoCapitalize="none"
              keyboardType="email-address"
              underlineColorAndroid="transparent"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              value={personalForm.phone}
              onChangeText={(val) => setPersonalForm((prev) => ({ ...prev, phone: val }))}
              keyboardType="phone-pad"
              underlineColorAndroid="transparent"
            />
          </View>
        </Card>

        {/* SECURITY CARD */}
        <Card style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>SECURITY</Text>
            {isSecurityDirty ? (
              <TouchableOpacity onPress={handleSaveSecurity} disabled={savingSecurity} style={styles.cardSaveBtn}>
                {savingSecurity ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.cardSaveText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
          <StatusBanner status={securityStatus} />

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Required for password changes"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showCurrentPass}
                value={securityForm.currentPassword}
                onChangeText={(val) => setSecurityForm((prev) => ({ ...prev, currentPassword: val }))}
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPass(!showCurrentPass)}
                style={styles.eyeIcon}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showCurrentPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showNewPass}
                value={securityForm.password}
                onChangeText={(val) => setSecurityForm((prev) => ({ ...prev, password: val }))}
                underlineColorAndroid="transparent"
              />
              <TouchableOpacity
                onPress={() => setShowNewPass(!showNewPass)}
                style={styles.eyeIcon}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showNewPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* PROFESSIONAL INFORMATION CARD */}
        <Card style={styles.cardContainer}>
          <Text style={styles.cardTitle}>PROFESSIONAL INFO</Text>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Role</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{formatRole(user?.role)}</Text>
            </View>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Company</Text>
            <Text style={styles.infoValueText}>{user?.companyName || '-'}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Branch</Text>
            <Text style={styles.infoValueText}>{user?.branchName || '-'}</Text>
          </View>
        </Card>
        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.85}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                  await signOut();
                },
              },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Logout from Account</Text>
        </TouchableOpacity>

        {/* DELETE ACCOUNT BUTTON */}
        <TouchableOpacity
          style={styles.deleteBtn}
          activeOpacity={0.85}
          onPress={() => setDeleteConfirmVisible(true)}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator size="small" color={colors.danger} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 8, opacity: 0.8 }} />
          )}
          <Text style={styles.deleteBtnText}>{deletingAccount ? 'Deleting Account...' : 'Request Account Deletion'}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>v{APP_VERSION}</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete Account Request"
        message="This will deactivate your account immediately and sign you out. You will not be able to sign in again with this email."
        tone="danger"
        cancelText="Keep Account"
        confirmText={deletingAccount ? 'Deleting...' : 'Delete Account'}
        loading={deletingAccount}
        onCancel={() => {
          if (!deletingAccount) setDeleteConfirmVisible(false);
        }}
        onConfirm={handleDeleteAccount}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  closeBtn: {
    minWidth: 58,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  avatarContainer: {
    position: 'relative',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#E3DBD1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarFallback: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#EFE7DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8D7658',
    fontFamily: 'serif',
  },
  avatarLoader: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarControls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6E533D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  trashBtn: {
    backgroundColor: colors.danger,
  },
  avatarNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  avatarBranchText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  cardContainer: {
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.1,
  },
  cardSaveBtn: {
    minWidth: 86,
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6E533D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fieldBlock: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E3DBD1',
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    color: colors.text,
    fontSize: 14,
    includeFontPadding: false,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E3DBD1',
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingRight: spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
    includeFontPadding: false,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  infoBlock: {
    marginTop: spacing.md,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  infoValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  roleTag: {
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.25)',
    borderRadius: radii.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  roleTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  logoutBtn: {
    flexDirection: 'row',
    borderWidth: 1.3,
    borderColor: 'rgba(138, 58, 58, 0.4)',
    borderRadius: radii.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(138, 58, 58, 0.06)',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  logoutBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  deleteBtn: {
    flexDirection: 'row',
    borderWidth: 1.3,
    borderColor: 'rgba(138, 58, 58, 0.25)',
    borderRadius: radii.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  deleteBtnText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
    opacity: 0.8,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: 'rgba(46, 74, 53, 0.08)',
    borderColor: 'rgba(46, 74, 53, 0.25)',
  },
  statusError: {
    backgroundColor: 'rgba(138, 58, 58, 0.08)',
    borderColor: 'rgba(138, 58, 58, 0.25)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  statusTextSuccess: {
    color: '#2E4A35',
  },
  statusTextError: {
    color: '#8A3A3A',
  },
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '500',
    opacity: 0.6,
  },
});

export default UserProfileScreen;
