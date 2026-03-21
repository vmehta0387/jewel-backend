import React, { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { colors, radii, spacing } from '../theme';
import { useAuth } from '../context/AuthContext';

const LoginScreen = () => {
  const {
    signIn,
    biometricAvailable,
    biometricEnabled,
    biometricRequired,
    biometricPrompted,
    biometricSignIn,
    setBiometricPreference,
  } = useAuth();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const activeInputRef = useRef<TextInput | null>(null);
  const scrollOffsetRef = useRef(0);
  const keyboardTopRef = useRef<number | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const keyboardVisible = keyboardInset > 0;

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const scrollFocusedInputIntoView = () => {
      const targetInput = activeInputRef.current;
      const keyboardTop = keyboardTopRef.current;

      if (!targetInput || keyboardTop === null) {
        return;
      }

      targetInput.measureInWindow((_x, y, _width, height) => {
        const gap = 14;
        const inputBottom = y + height;
        const visibleBottom = keyboardTop - gap;

        if (inputBottom <= visibleBottom) {
          return;
        }

        const neededOffset = inputBottom - visibleBottom;
        const nextOffset = Math.max(0, scrollOffsetRef.current + neededOffset);
        scrollRef.current?.scrollTo({ y: nextOffset, animated: true });
      });
    };

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const height = Math.max(0, event.endCoordinates.height - insets.bottom);
      keyboardTopRef.current =
        event.endCoordinates.screenY ?? Math.max(0, windowHeight - event.endCoordinates.height);
      setKeyboardInset(height);
      requestAnimationFrame(scrollFocusedInputIntoView);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardTopRef.current = null;
      setKeyboardInset(0);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, windowHeight]);

  const scrollToFocusedInput = (inputRef: TextInput | null) => {
    activeInputRef.current = inputRef;

    if (keyboardTopRef.current === null) {
      return;
    }

    requestAnimationFrame(() => {
      inputRef?.measureInWindow((_x, y, _width, height) => {
        const gap = 14;
        const inputBottom = y + height;
        const visibleBottom = keyboardTopRef.current! - gap;

        if (inputBottom <= visibleBottom) {
          return;
        }

        const neededOffset = inputBottom - visibleBottom;
        const nextOffset = Math.max(0, scrollOffsetRef.current + neededOffset);
        scrollRef.current?.scrollTo({ y: nextOffset, animated: true });
      });
    });
  };

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

  const handleBiometric = async () => {
    setError(null);
    setBiometricLoading(true);
    try {
      await biometricSignIn();
    } catch (err: any) {
      setError(err?.message || 'Biometric login failed');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.contentStage,
            { minHeight: Math.max(0, windowHeight - insets.top - spacing.lg * 2) },
          ]}
        >
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
                  ref={emailInputRef}
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  onFocus={() => scrollToFocusedInput(emailInputRef.current)}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                />

                <Text style={styles.label}>Password</Text>
                <View style={styles.inputGroup}>
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.input, styles.inputWithIcon]}
                    placeholder="Password"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onFocus={() => scrollToFocusedInput(passwordInputRef.current)}
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => setShowPassword((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.signInButton} />
                {biometricAvailable && biometricEnabled ? (
                  <Button
                    title={biometricRequired ? 'Unlock with Biometrics' : 'Use Biometrics'}
                    onPress={handleBiometric}
                    loading={biometricLoading}
                    variant="secondary"
                    style={styles.biometricButton}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </View>
        {keyboardVisible ? <View style={{ height: keyboardInset + spacing.sm }} /> : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: spacing.xl,
  },
  contentStage: {
    justifyContent: 'center',
  },
  content: {
    zIndex: 1,
    width: '100%',
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
  signInButton: {
    backgroundColor: '#111827',
  },
  biometricButton: {
    marginTop: spacing.sm,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
});

export default LoginScreen;
