import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import type { AuthUser } from '../types';
import { login as loginApi, me as meApi, signup as signupApi } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { configureActivityContext, configureActivityTracker, flushActivityEvents } from '../utils/activityTracker';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const BIOMETRIC_KEY = 'auth_biometric_enabled';
const BIOMETRIC_PROMPTED_KEY = 'auth_biometric_prompted';
const SECURE_TOKEN_KEY = 'auth_secure_token';
const DEVICE_ID_KEY = 'activity_device_id';
const MOBILE_ALLOWED_ROLES = new Set(['SALES_REP', 'BRANCH_MANAGER']);

const createDeviceId = () => `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  biometricRequired: boolean;
  biometricPrompted: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  biometricSignIn: () => Promise<void>;
  setBiometricPreference: (enabled: boolean) => Promise<void>;
  signOut: (options?: { clearBiometric?: boolean }) => Promise<void>;
  refresh: (updatedUser?: AuthUser) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricRequired, setBiometricRequired] = useState(false);
  const [biometricPrompted, setBiometricPrompted] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  const checkBiometricAvailable = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) return false;
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch {
      return false;
    }
  }, []);

  const assertMobileAccessRole = useCallback((nextUser: AuthUser) => {
    if (!MOBILE_ALLOWED_ROLES.has(nextUser.role)) {
      throw new Error('This role is not allowed in the mobile app');
    }
  }, []);

  const loadStored = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      const biometricFlag = await AsyncStorage.getItem(BIOMETRIC_KEY);
      const biometricPromptedFlag = await AsyncStorage.getItem(BIOMETRIC_PROMPTED_KEY);
      const available = await checkBiometricAvailable();
      const biometricOn = biometricFlag === 'true' && available;
      setBiometricAvailable(available);
      setBiometricPrompted(biometricPromptedFlag === 'true');

      if (biometricOn) {
        const secureToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
        if (secureToken) {
          setBiometricEnabled(true);
          setBiometricRequired(true);
          return;
        }
        await AsyncStorage.removeItem(BIOMETRIC_KEY);
        await AsyncStorage.removeItem(BIOMETRIC_PROMPTED_KEY);
        setBiometricEnabled(false);
        setBiometricPrompted(false);
      } else {
        setBiometricEnabled(false);
      }

      if (storedToken) {
        const me = await meApi(storedToken);
        assertMobileAccessRole(me);
        setToken(storedToken);
        setUser(me);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
      }
    } catch {
      setUser(null);
      setToken(null);
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, BIOMETRIC_KEY, BIOMETRIC_PROMPTED_KEY]);
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
      setBiometricEnabled(false);
      setBiometricPrompted(false);
    } finally {
      setIsLoading(false);
    }
  }, [assertMobileAccessRole, checkBiometricAvailable]);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  useEffect(() => {
    let mounted = true;

    const ensureDeviceId = async () => {
      try {
        const storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
        const nextDeviceId = storedDeviceId || createDeviceId();
        if (!storedDeviceId) {
          await AsyncStorage.setItem(DEVICE_ID_KEY, nextDeviceId);
        }
        if (mounted) {
          setDeviceId(nextDeviceId);
        }
      } catch {
        if (mounted) {
          setDeviceId(createDeviceId());
        }
      }
    };

    void ensureDeviceId();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    configureActivityTracker(() => token);
  }, [token]);

  useEffect(() => {
    configureActivityContext(() => ({
      userId: user?.id,
      deviceId,
      deviceType: Platform.OS,
    }));
  }, [deviceId, user?.id]);

  const signUp = useCallback(
    async (data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      password: string;
    }) => {
      await signupApi(data);
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await loginApi(email, password);
      assertMobileAccessRole(response.user);
      
      const available = await checkBiometricAvailable();
      setBiometricAvailable(available);

      const promptedFlag = await AsyncStorage.getItem(BIOMETRIC_PROMPTED_KEY);
      const isPrompted = promptedFlag === 'true';

      if (available && !isPrompted) {
        await new Promise<void>((resolve) => {
          Alert.alert(
            'Enable biometrics?',
            'Use Face ID or fingerprint for faster sign-in on this device.',
            [
              { 
                text: 'Not now', 
                style: 'cancel', 
                onPress: async () => {
                  setBiometricPrompted(true);
                  await AsyncStorage.setItem(BIOMETRIC_PROMPTED_KEY, 'true');
                  setBiometricEnabled(false);
                  await AsyncStorage.removeItem(BIOMETRIC_KEY);
                  await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
                  resolve();
                } 
              },
              { 
                text: 'Enable', 
                onPress: async () => {
                  setBiometricPrompted(true);
                  await AsyncStorage.setItem(BIOMETRIC_PROMPTED_KEY, 'true');
                  await SecureStore.setItemAsync(SECURE_TOKEN_KEY, response.accessToken);
                  await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
                  setBiometricEnabled(true);
                  resolve();
                } 
              },
            ],
            { cancelable: false }
          );
        });
      }

      setToken(response.accessToken);
      setUser(response.user);
      await AsyncStorage.setItem(TOKEN_KEY, response.accessToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      void flushActivityEvents();
    },
    [assertMobileAccessRole, checkBiometricAvailable],
  );

  const setBiometricPreference = useCallback(async (enabled: boolean) => {
    setBiometricPrompted(true);
    await AsyncStorage.setItem(BIOMETRIC_PROMPTED_KEY, 'true');
    if (!enabled) {
      setBiometricEnabled(false);
      await AsyncStorage.removeItem(BIOMETRIC_KEY);
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
      return;
    }
    const currentToken = token || (await AsyncStorage.getItem(TOKEN_KEY));
    if (!currentToken) {
      setBiometricEnabled(false);
      await AsyncStorage.removeItem(BIOMETRIC_KEY);
      return;
    }
    await SecureStore.setItemAsync(SECURE_TOKEN_KEY, currentToken);
    await AsyncStorage.setItem(BIOMETRIC_KEY, 'true');
    setBiometricEnabled(true);
  }, [token]);

  const biometricSignIn = useCallback(async () => {
    const enabledFlag = await AsyncStorage.getItem(BIOMETRIC_KEY);
    if (enabledFlag !== 'true') {
      throw new Error('Biometric login not enabled');
    }
    const available = await checkBiometricAvailable();
    setBiometricAvailable(available);
    if (!available) {
      throw new Error('Biometric authentication not available');
    }
    const storedToken = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
    if (!storedToken) {
      await AsyncStorage.removeItem(BIOMETRIC_KEY);
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
      setBiometricEnabled(false);
      setBiometricPrompted(false);
      throw new Error('Please sign in once to enable biometrics');
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock with biometrics',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use password',
    });
    if (!result.success) {
      throw new Error('Biometric authentication cancelled');
    }
    const me = await meApi(storedToken);
    assertMobileAccessRole(me);
    setUser(me);
    await AsyncStorage.setItem(TOKEN_KEY, storedToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
    setToken(storedToken);
    setBiometricRequired(false);
    void flushActivityEvents();
  }, [assertMobileAccessRole, checkBiometricAvailable]);

  const signOut = useCallback(async (options?: { clearBiometric?: boolean }) => {
    setUser(null);
    setToken(null);
    const shouldClearBiometric = options?.clearBiometric === true;
    setBiometricRequired(shouldClearBiometric ? false : biometricEnabled);
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    if (shouldClearBiometric) {
      setBiometricEnabled(false);
      setBiometricPrompted(false);
      await AsyncStorage.removeItem(BIOMETRIC_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_PROMPTED_KEY);
      await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
    }
  }, [biometricEnabled]);

  useEffect(() => {
    setUnauthorizedHandler(signOut);
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const refresh = useCallback(async (updatedUser?: AuthUser) => {
    if (!token) return;
    const me = updatedUser || await meApi(token);
    setUser(me);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      biometricAvailable,
      biometricEnabled,
      biometricRequired,
      biometricPrompted,
      signIn,
      signUp,
      biometricSignIn,
      setBiometricPreference,
      signOut,
      refresh,
    }),
    [
      user,
      token,
      isLoading,
      biometricAvailable,
      biometricEnabled,
      biometricRequired,
      biometricPrompted,
      signIn,
      signUp,
      biometricSignIn,
      setBiometricPreference,
      signOut,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};


