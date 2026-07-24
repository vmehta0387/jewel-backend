import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { APP_VERSION, PLAY_STORE_URL, APP_STORE_URL, isVersionOutdated } from '../config';
import { getMobileConfig } from '../api/auth';

const LoginScreen = () => {
  const { signIn, biometricAvailable, biometricEnabled, biometricSignIn } = useAuth();
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const config = await getMobileConfig();
        if (config && config.status) {
          setSignupEnabled(config.signup);

          const latestVersion = Platform.OS === 'android'
            ? config.current_version.android
            : config.current_version.ios;

          const shouldBypass = config.current_version.by_pass;

          if (!shouldBypass && isVersionOutdated(APP_VERSION, latestVersion)) {
            Alert.alert(
              'Update Available',
              `A new version (${latestVersion}) of the app is available. You are using v${APP_VERSION}. Please update the app to get the latest features.`,
              [
                {
                  text: 'May be later',
                  style: 'cancel',
                },
                {
                  text: 'Update now',
                  onPress: () => {
                    const storeUrl = Platform.OS === 'android' ? PLAY_STORE_URL : APP_STORE_URL;
                    Linking.openURL(storeUrl).catch((err) =>
                      console.error('Failed to open store URL:', err)
                    );
                  },
                },
              ],
              { cancelable: true }
            );
          }
        }
      } catch (err) {
        console.warn('Failed to load mobile config:', err);
      }
    };
    checkConfig();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter email and password to continue');
      return;
    }
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

  const handleBiometricLogin = async () => {
    setError(null);
    try {
      await biometricSignIn();
    } catch (err: any) {
      setError(err?.message || 'Biometric authentication failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.brandRow}>
              <Image
                source={require('../../assets/login-logo.png')}
                style={styles.loginLogo}
              />
            </View>

            <View style={styles.cardContainer}>
              <View style={styles.formContainer}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Sign in to continue</Text>
                  <Text style={styles.formSubtitle}>Use your assigned work credentials</Text>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>EMAIL</Text>
                  <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#A8A29A"
                  value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                </View>

              <View style={[styles.inputWrapper, { marginBottom: 12 }]}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.input, styles.inputWithIcon, styles.passwordInputBorder]}
                    placeholder="**********"
                    placeholderTextColor="#A8A29A"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity style={styles.iconButton} onPress={() => setShowPassword((prev) => !prev)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#8D8780" />
                  </TouchableOpacity>
                </View>

                {biometricAvailable && biometricEnabled ? (
                  <TouchableOpacity style={styles.forgotBtn} onPress={handleBiometricLogin}>
                    <View style={styles.biometricRow}>
                      <Ionicons name="finger-print" size={14} color="#9E7A45" style={{ marginRight: 4 }} />
                      <Text style={styles.forgotText}>Unlock with biometrics</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={styles.signInTouch}
                onPress={handleLogin}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                <View style={styles.signInBtn}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={styles.btnContent}>
                      <Ionicons name="flash-sharp" size={16} color="#D2A85B" style={styles.btnFlashIcon} />
                      <Text style={styles.signInButtonText}>Sign in instantly</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.bottomLinkContainer}>
                {signupEnabled ? (
                  <TouchableOpacity onPress={() => navigation.navigate('Signup')} style={{ marginBottom: 12 }}>
                    <Text style={styles.bottomLinkText}>
                      <Text style={styles.bottomLinkMuted}>Don't have an account? </Text>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                ) : null}

                <Text style={[styles.bottomLinkText, { fontSize: 11, opacity: 0.7, marginBottom: 8 }]}>
                  <Text style={styles.bottomLinkMuted}>Need access? </Text>
                  Contact your admin
                </Text>

                <Text style={styles.versionText}>v{APP_VERSION}</Text>
              </View>
            </View>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 26,
    paddingTop: 46,
    paddingBottom: 40,
  },
  brandRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loginLogo: {
    width: 230,
    height: 230,
    resizeMode: 'contain',
  },
  brandIcon: {
    marginBottom: 4,
    textShadowColor: 'rgba(183, 138, 70, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: 4.5,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#BE9150',
    letterSpacing: 3,
    marginBottom: 16,
  },
  tinyLine: {
    width: 24,
    height: 1.5,
    backgroundColor: '#BE9150',
    opacity: 0.6,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginTop: -10,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E9E6E0',
  },
  formContainer: {
    width: '100%',
  },
  formHeader: {
    marginBottom: 18,
  },
  formTitle: {
    fontSize: 21,
    lineHeight: 24,
    color: '#171717',
    fontWeight: '700',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#8E877F',
    fontWeight: '500',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E877F',
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  input: {
    backgroundColor: '#FCFBF9',
    borderWidth: 1,
    borderColor: '#D9D5CF',
    borderRadius: 14,
    height: 54,
    paddingHorizontal: 16,
    color: '#111111',
    fontSize: 15,
  },
  passwordInputBorder: {
    borderColor: '#D9D5CF',
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
    marginTop: 12,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forgotText: {
    color: '#97723F',
    fontSize: 13,
    fontWeight: '500',
  },
  signInTouch: {
    marginTop: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 7,
  },
  signInBtn: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#111111',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnFlashIcon: {
    marginRight: 6,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    color: '#D9534F',
    marginBottom: 10,
    fontSize: 13,
    textAlign: 'center',
  },
  bottomLinkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  bottomLinkText: {
    color: '#97723F',
    fontSize: 13,
    fontWeight: '400',
  },
  bottomLinkMuted: {
    color: '#111111',
  },
  versionText: {
    fontSize: 12,
    color: '#8E877F',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
    opacity: 0.6,
  },
});

export default LoginScreen;
