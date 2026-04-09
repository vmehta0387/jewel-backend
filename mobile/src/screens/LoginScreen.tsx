import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.frame}>

            <View style={styles.brandRow}>
              <Ionicons name="flash-sharp" size={46} color="#C59A39" style={{ marginBottom: 12 }} />
              <Text style={styles.brandTitle}>BLITZ</Text>
              <Text style={styles.brandSubtitle}>N E W   Y O R K   C I T Y</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="sarah@luxejewels.com"
                  placeholderTextColor="#191715"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, styles.inputWithIcon]}
                    placeholder="••••••••••"
                    placeholderTextColor="#A8A29A"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={styles.iconButton} onPress={() => setShowPassword((prev) => !prev)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#A8A29A" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.forgotBtn}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.signInButton, loading && styles.signInButtonDisabled]} 
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                   <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <View style={styles.btnContent}>
                    <Ionicons name="flash" size={18} color="#FFF" />
                    <Text style={styles.signInButtonText}>Sign in instantly</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.bottomLinkContainer}>
                <Text style={styles.bottomLinkText}>Need access? Contact your admin</Text>
              </View>

            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE9', 
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 40,
  },
  frame: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 28,
  },
  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 44,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1916',
    letterSpacing: 4,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#C59A39',
    letterSpacing: 3,
    marginBottom: 16,
  },
  divider: {
    width: 28,
    height: 1.5,
    backgroundColor: '#C59A39',
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9E978F',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E0D9',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#1C1916',
    fontSize: 15,
    fontWeight: '500',
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
    bottom: 0,
    justifyContent: 'center',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  forgotText: {
    color: '#C59A39',
    fontSize: 12,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: '#C89B3A',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  error: {
    color: '#D9534F',
    marginBottom: 10,
    fontSize: 13,
    textAlign: 'center',
  },
  bottomLinkContainer: {
    marginTop: 26,
    alignItems: 'center',
  },
  bottomLinkText: {
    color: '#ACA59D',
    fontSize: 13,
    fontWeight: '400',
  },
});

export default LoginScreen;
