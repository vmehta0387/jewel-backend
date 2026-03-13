import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser } from '../types';
import { login as loginApi, me as meApi } from '../api/auth';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStored = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          const me = await meApi(storedToken);
          setUser(me);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await loginApi(email, password);
    setToken(response.accessToken);
    setUser(response.user);
    await AsyncStorage.setItem(TOKEN_KEY, response.accessToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    const me = await meApi(token);
    setUser(me);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(me));
  }, [token]);

  const value = useMemo(
    () => ({ user, token, isLoading, signIn, signOut, refresh }),
    [user, token, isLoading, signIn, signOut, refresh],
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
