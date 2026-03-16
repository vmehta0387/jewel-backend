import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.background}>
        <View style={styles.topWash} />
        <View style={styles.bottomWash} />
        <View style={styles.sideWash} />
      </View>

      <View style={styles.content}>
        <View style={styles.frame}>
          <View style={styles.card}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>JS</Text>
            </View>
            <Text style={styles.brandTitle}>Jewelry Sales</Text>
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

          <View style={styles.helperRow}>
            <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe((prev) => !prev)}>
              <View style={[styles.checkbox, rememberMe ? styles.checkboxChecked : null]}>
                {rememberMe ? <View style={styles.checkboxDot} /> : null}
              </View>
              <Text style={styles.helperText}>Remember for 30 Days</Text>
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
    backgroundColor: colors.background,
  },
  topWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: colors.accent,
    opacity: 0.2,
  },
  bottomWash: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: colors.muted,
    opacity: 0.18,
  },
  sideWash: {
    position: 'absolute',
    top: 120,
    right: -40,
    width: 180,
    height: 260,
    borderRadius: 120,
    backgroundColor: colors.secondary,
    opacity: 0.18,
  },
  content: {
    zIndex: 1,
  },
  frame: {
    backgroundColor: '#f4ede2',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#e2d6c8',
    padding: spacing.md,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: '#fffdf9',
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderColor: '#eadfd2',
    borderWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#d59a5a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5b3a1a',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    marginTop: 4,
    marginBottom: spacing.md,
    color: colors.textMuted,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.2,
    borderColor: '#d9c9b6',
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
    backgroundColor: '#ffffff',
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
    right: 12,
    top: 0,
    bottom: spacing.md,
    justifyContent: 'center',
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: spacing.md,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d9c9b6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    borderColor: '#d59a5a',
    backgroundColor: '#d59a5a',
  },
  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  signInButton: {
    backgroundColor: '#111827',
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
