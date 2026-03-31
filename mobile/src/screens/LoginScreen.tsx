import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const {
    signIn,
    biometricAvailable,
    biometricEnabled,
    biometricPrompted,
    setBiometricPreference,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      if (biometricAvailable && !biometricEnabled && !biometricPrompted) {
        Alert.alert(
          'Enable biometrics?',
          'Use Face ID or fingerprint for faster sign-in on this device.',
          [
            { text: 'Not now', style: 'cancel', onPress: () => setBiometricPreference(false) },
            { text: 'Enable', onPress: () => setBiometricPreference(true) },
          ],
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.container} bgImage={require('../../assets/login_bg.png')}>
  

      <View style={styles.content}>
        <View style={styles.frame}>
          <View style={styles.card}>
            <View style={styles.brandRow}>
              <Text style={styles.brandTitle}>JEWELRY SALES</Text>
            </View>

            <Text style={styles.welcomeTitle}>WELCOME</Text>
            <Text style={styles.welcomeSubtitle}>Please enter your details to continue.</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowPassword((prev) => !prev)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.signInButton} />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    padding: spacing.lg,
  },
  background: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 120,
  },
  frame: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 2,
  },
  welcomeTitle: {
    fontFamily: 'serif',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '500',
    color: colors.text,
  },
  welcomeSubtitle: {
    marginTop: 6,
    marginBottom: spacing.xl,
    color: colors.textMuted,
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8B7355',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: colors.text,
  },
  inputGroup: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingRight: 44,
  },
  iconButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: spacing.lg,
    justifyContent: 'center',
  },
  signInButton: {
    backgroundColor: '#2C1E16',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 18,
    width: '60%',
    alignSelf: 'center',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  loadingOverlay: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});

export default LoginScreen;
