import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer, DefaultTheme, StackActions, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { registerPushDevice } from '../api/notifications';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import CatalogCategoryScreen from '../screens/CatalogCategoryScreen';
import DesignsScreen from '../screens/DesignsScreen';
import DesignDetailScreen from '../screens/DesignDetailScreen';
import QuoteBuilderScreen from '../screens/QuoteBuilderScreen';
import QuoteSummaryScreen from '../screens/QuoteSummaryScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderPeriodListScreen from '../screens/OrderPeriodListScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import BranchTeamScreen from '../screens/BranchTeamScreen';
import CompanyBranchesScreen from '../screens/CompanyBranchesScreen';
import BranchEmployeeFormScreen from '../screens/BranchEmployeeFormScreen';
import BranchRepProfileScreen from '../screens/BranchRepProfileScreen';
import BranchDashboardScreen from '../screens/BranchDashboardScreen';
import SpiffRewardsScreen from '../screens/SpiffRewardsScreen';
import AiChatScreen from '../screens/AiChatScreen';
import PricingScreen from '../screens/PricingScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import type { BranchEmployee, SelectedDesignOptions, UserRole } from '../types';
import type { MobileConfiguratorResponse } from '../api/designs';
import { getOrderIdFromNotification, getSpiffClaimTargetFromNotification } from '../utils/appNotifications';
import { hasActionPermission, hasAnyActionPermission } from '../utils/permissions';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type CatalogPresetCategory = string;

export type QuoteBuilderDraft = {
  orderId?: string;
  orderNumber?: string;
  createdAt?: string;
  status?: string;
  designId: string;
  designNo: string;
  designName?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  shortDescription?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  salesRepId?: string;
  purchaseOrderNumber?: string;
  notes?: string;
  configurator?: MobileConfiguratorResponse;
  selectedOptions?: SelectedDesignOptions | null;
  selection?: {
    diamondType?: string;
    shape?: string;
    style?: string;
    metalColor?: string;
    weight?: string;
    quality?: string;
    ringSize?: string;
  };
};

export type QuoteSummaryPayload = {
  orderId?: string;
  orderNumber?: string;
  createdAt?: string;
  status?: string;
  shortDescription?: string;
  designId: string;
  designNo: string;
  designName?: string | null;
  imageUrl?: string | null;
  price: number;
  selectedOptions?: SelectedDesignOptions | null;
  selection: {
    shape?: string;
    metalColor?: string;
    style?: string;
    weight?: string;
    quality?: string;
    ringSize?: string;
  };
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  salesRepName?: string;
  purchaseOrderNumber?: string;
  branchName?: string;
  notes?: string;
};

export type DesignsStackParamList = {
  CatalogCategories: undefined;
  Designs: { presetCategory?: CatalogPresetCategory; prefillSearch?: string } | undefined;
  DesignDetail: { designId: string; presetCategory?: CatalogPresetCategory };
  QuoteBuilder: { draft: QuoteBuilderDraft };
  QuoteSummary: { summary: QuoteSummaryPayload };
};

export type OrdersStackParamList = {
  Orders: { initialFilter?: 'QUOTE' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED' } | undefined;
  OrderPeriodList: { initialPeriod?: 'TODAY' | 'WEEKLY' | 'MONTHLY' | 'ANNUALLY'; openKey?: number } | undefined;
  OrderDetail: { orderId: string };
  QuoteBuilder: { draft: QuoteBuilderDraft };
  QuoteSummary: { summary: QuoteSummaryPayload };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  SpiffRewards: { claimId?: string; claimNumber?: string; initialPanel?: 'ACTIVITY' | 'REDEEM' | 'COMPANY_BOARD' | 'GLOBAL_BOARD' } | undefined;
  UserProfile: undefined;
  TeamList: { branchId?: string; branchName?: string } | undefined;
  BranchEmployeeForm: { mode: 'create' } | { mode: 'edit'; employeeId: string };
  BranchRepProfile: { employee: BranchEmployee };
};

export type TeamStackParamList = {
  BranchesHome: undefined;
  TeamList: { branchId?: string; branchName?: string } | undefined;
  BranchEmployeeForm: { mode: 'create' } | { mode: 'edit'; employeeId: string };
  BranchRepProfile: { employee: BranchEmployee };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const DesignsStack = createNativeStackNavigator<DesignsStackParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const TeamStack = createNativeStackNavigator<TeamStackParamList>();
const Tabs = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<RootStackParamList>();
const NAVIGATION_STATE_KEY_PREFIX = 'navigation_state';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
    primary: colors.primary,
    card: colors.card,
    text: colors.text,
    border: colors.border,
  },
};

const canReceivePushForRole = (role?: UserRole) =>
  role === 'BRANCH_MANAGER' || role === 'SALES_REP' || role === 'COMPANY_ADMIN';

const routeFromPushNotification = (data: Record<string, unknown> | null | undefined) => {
  if (!data || !navigationRef.isReady()) {
    return;
  }

  const orderId = getOrderIdFromNotification({
    entityType: String(data.entityType || ''),
    entityId: String(data.entityId || ''),
    metadata: (data.metadata as Record<string, unknown> | null) || null,
  });

  if (orderId) {
    (navigationRef as any).navigate('App', {
      screen: 'OrdersTab',
      params: {
        screen: 'OrderDetail',
        params: { orderId },
      },
    });
    return;
  }

  const spiffTarget = getSpiffClaimTargetFromNotification({
    entityType: String(data.entityType || ''),
    entityId: String(data.entityId || ''),
    metadata: (data.metadata as Record<string, unknown> | null) || null,
  });

  if (spiffTarget) {
    (navigationRef as any).navigate('App', {
      screen: 'DashboardTab',
      params: {
        screen: 'SpiffRewards',
        params: spiffTarget,
      },
    });
  }
};

const registerForPushNotificationsAsync = async (authToken: string) => {
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A67F3F',
    });
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let status = currentPermissions.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId
    || (Constants as any)?.easConfig?.projectId
    || undefined;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const expoPushToken = tokenResponse.data;
  if (!expoPushToken) {
    return null;
  }

  await registerPushDevice(authToken, {
    expoPushToken,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version || Constants.manifest2?.extra?.expoClient?.version || '1.0.0',
  });

  return expoPushToken;
};

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

const DesignsNavigator = () => (
  <DesignsStack.Navigator screenOptions={{ headerShown: false }}>
    <DesignsStack.Screen name="CatalogCategories" component={CatalogCategoryScreen} options={{ title: 'Catalog' }} />
    <DesignsStack.Screen name="Designs" component={DesignsScreen} options={{ title: 'Designs' }} />
    <DesignsStack.Screen name="DesignDetail" component={DesignDetailScreen} options={{ title: 'Design Detail' }} />
    <DesignsStack.Screen name="QuoteBuilder" component={QuoteBuilderScreen} options={{ title: 'Quote Builder' }} />
    <DesignsStack.Screen name="QuoteSummary" component={QuoteSummaryScreen} options={{ title: 'Order Summary' }} />
  </DesignsStack.Navigator>
);

const OrdersNavigator = () => (
  <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
    <OrdersStack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
    <OrdersStack.Screen name="OrderPeriodList" component={OrderPeriodListScreen} options={{ title: 'Period Orders' }} />
    <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Detail' }} />
    <OrdersStack.Screen name="QuoteBuilder" component={QuoteBuilderScreen} options={{ title: 'Quote Builder' }} />
    <OrdersStack.Screen name="QuoteSummary" component={QuoteSummaryScreen} options={{ title: 'Order Summary' }} />
  </OrdersStack.Navigator>
);

const DashboardNavigator = () => (
  <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
    <DashboardStack.Screen name="DashboardHome" component={BranchDashboardScreen} options={{ title: 'Dashboard' }} />
    <DashboardStack.Screen name="SpiffRewards" component={SpiffRewardsScreen} options={{ title: 'Spiff Rewards' }} />
    <DashboardStack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'My Profile' }} />
    <DashboardStack.Screen name="TeamList" component={BranchTeamScreen} options={{ title: 'Team' }} />
    <DashboardStack.Screen name="BranchRepProfile" component={BranchRepProfileScreen} options={{ title: 'Rep Profile' }} />
    <DashboardStack.Screen name="BranchEmployeeForm" component={BranchEmployeeFormScreen} options={{ title: 'Employee' }} />
  </DashboardStack.Navigator>
);

const TeamNavigator = () => {
  const { user } = useAuth();
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN';

  return (
    <TeamStack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={isCompanyAdmin ? 'BranchesHome' : 'TeamList'}
    >
      <TeamStack.Screen name="BranchesHome" component={CompanyBranchesScreen} options={{ title: 'Branches' }} />
      <TeamStack.Screen name="TeamList" component={BranchTeamScreen} options={{ title: 'Team' }} />
      <TeamStack.Screen name="BranchRepProfile" component={BranchRepProfileScreen} options={{ title: 'Rep Profile' }} />
      <TeamStack.Screen name="BranchEmployeeForm" component={BranchEmployeeFormScreen} options={{ title: 'Employee' }} />
    </TeamStack.Navigator>
  );
};

const AppTabs: React.FC<{ role?: UserRole }> = ({ role }) => {
  const { user } = useAuth();
  const isCompanyAdmin = role === 'COMPANY_ADMIN';
  const canOpenPricing = isCompanyAdmin && hasActionPermission(user, 'mobile.pricing.view');
  const canOpenSpiff = hasAnyActionPermission(user, ['mobile.spiff.view', 'spiff.view']);
  const canOpenTeam =
    (role === 'BRANCH_MANAGER' || role === 'COMPANY_ADMIN') &&
    hasAnyActionPermission(user, ['branch.view', 'team.employee.manage']);
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 14) : insets.bottom;
  const tabBarHeight = Platform.OS === 'android' ? 62 + tabBarBottomInset : 60 + tabBarBottomInset;
  const teamRootScreen = isCompanyAdmin ? 'BranchesHome' : 'TeamList';
  const resetStackTab = (tabName: string, rootScreen: string) => ({ navigation, route }: any) => ({
    tabPress: (event: any) => {
      if (!navigation.isFocused()) return;

      event.preventDefault();

      const state = route.state;
      if (state?.type === 'stack' && state.key && state.index > 0) {
        navigation.dispatch({
          ...StackActions.popToTop(),
          target: state.key,
        });
      }

      navigation.navigate(tabName, {
        screen: rootScreen,
      });
    },
  });

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E9E5DF',
          borderTopWidth: 1,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'android' ? tabBarBottomInset : 8 + tabBarBottomInset,
          paddingTop: Platform.OS === 'android' ? 6 : 6,
          marginHorizontal: 0,
          marginBottom: 0,
          borderRadius: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          lineHeight: 14,
        },
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ size, focused }) => {
          const iconSize = size ? Math.max(18, size - 2) : 19;
          const name = (() => {
            switch (route.name) {
              case 'DashboardTab':
                return focused ? 'grid' : 'grid-outline';
              case 'SpiffTab':
                return focused ? 'star' : 'star-outline';
              case 'DesignsTab':
                return focused ? 'search' : 'search-outline';
              case 'OrdersTab':
                return focused ? 'receipt' : 'receipt-outline';
              case 'PricingTab':
                return focused ? 'cash' : 'cash-outline';
              case 'AiTab':
                return focused ? 'flash-sharp' : 'flash-outline';
              case 'TeamTab':
                return focused ? 'people' : 'people-outline';
              default:
                return 'grid-outline';
            }
          })();

          return (
            <View style={styles.iconWrap}>
              <View style={[styles.tabIcon, focused ? styles.tabIconActive : null]}>
                <Ionicons name={name} size={iconSize} color={focused ? '#2C1E16' : '#8B7355'} />
              </View>
            </View>
          );
        },
      })}
    >
      {role === 'BRANCH_MANAGER' || role === 'SALES_REP' || role === 'COMPANY_ADMIN' ? (
        <Tabs.Screen
          name="DashboardTab"
          component={DashboardNavigator}
          options={{ title: 'Dashboard' }}
          listeners={resetStackTab('DashboardTab', 'DashboardHome')}
        />
      ) : null}

      {isCompanyAdmin && canOpenSpiff ? (
        <Tabs.Screen name="SpiffTab" component={SpiffRewardsScreen} options={{ title: 'SPIFF' }} />
      ) : (
        <Tabs.Screen
          name="DesignsTab"
          component={DesignsNavigator}
          options={{ title: 'Catalog' }}
          listeners={resetStackTab('DesignsTab', 'CatalogCategories')}
        />
      )}
      <Tabs.Screen
        name="OrdersTab"
        component={OrdersNavigator}
        options={{ title: 'Orders' }}
        listeners={resetStackTab('OrdersTab', 'Orders')}
      />
      {canOpenPricing ? <Tabs.Screen name="PricingTab" component={PricingScreen} options={{ title: 'Pricing' }} /> : null}
      {!isCompanyAdmin ? <Tabs.Screen name="AiTab" component={AiChatScreen} options={{ title: 'AI Sales' }} /> : null}
      {canOpenTeam ? (
        <Tabs.Screen
          name="TeamTab"
          component={TeamNavigator}
          options={{ title: 'Team' }}
          listeners={resetStackTab('TeamTab', teamRootScreen)}
        />
      ) : null}
    </Tabs.Navigator>
  );
};

const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

const RootNavigator = () => {
  const { token, isLoading, user } = useAuth();
  const registeredPushTokenRef = useRef<string | null>(null);
  const persistedNavigationKeyRef = useRef<string | null>(null);
  const [initialNavigationState, setInitialNavigationState] = useState<any>(undefined);
  const [isNavigationStateLoading, setIsNavigationStateLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    let active = true;
    const restoreNavigationState = async () => {
      if (!token || !user?.id) {
        const previousKey = persistedNavigationKeyRef.current;
        persistedNavigationKeyRef.current = null;
        setInitialNavigationState(undefined);
        setIsNavigationStateLoading(false);
        if (previousKey) {
          await AsyncStorage.removeItem(previousKey);
        }
        return;
      }

      const storageKey = `${NAVIGATION_STATE_KEY_PREFIX}:${user.id}`;
      persistedNavigationKeyRef.current = storageKey;
      setIsNavigationStateLoading(true);
      try {
        const savedState = await AsyncStorage.getItem(storageKey);
        if (!active) return;
        setInitialNavigationState(savedState ? JSON.parse(savedState) : undefined);
      } catch {
        if (!active) return;
        setInitialNavigationState(undefined);
        await AsyncStorage.removeItem(storageKey);
      } finally {
        if (active) {
          setIsNavigationStateLoading(false);
        }
      }
    };

    void restoreNavigationState();
    return () => {
      active = false;
    };
  }, [isLoading, token, user?.id]);

  const handleNavigationStateChange = useCallback((state: any) => {
    const storageKey = persistedNavigationKeyRef.current;
    if (!storageKey || !state) return;
    void AsyncStorage.setItem(storageKey, JSON.stringify(state));
  }, []);

  useEffect(() => {
    if (!token || !user || !canReceivePushForRole(user.role)) {
      return undefined;
    }

    let isMounted = true;

    const registerDevice = async () => {
      try {
        const pushToken = await registerForPushNotificationsAsync(token);
        if (!isMounted || !pushToken) {
          return;
        }
        registeredPushTokenRef.current = pushToken;
      } catch {
        // Push registration is best-effort; in-app notifications remain available.
      }
    };

    void registerDevice();

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data || {}) as Record<string, unknown>;
      routeFromPushNotification(data);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response) {
        return;
      }
      const data = (response.notification.request.content.data || {}) as Record<string, unknown>;
      routeFromPushNotification(data);
    });

    return () => {
      isMounted = false;
      responseSubscription.remove();
    };
  }, [token, user]);

  if (isLoading || isNavigationStateLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      key={token && user?.id ? `app-navigation-${user.id}` : 'auth-navigation'}
      ref={navigationRef}
      theme={navigationTheme}
      initialState={token ? initialNavigationState : undefined}
      onStateChange={handleNavigationStateChange}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <RootStack.Screen name="App">
            {() => <AppTabs role={user?.role} />}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
  iconWrap: {
    width: 36,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: 'rgba(255, 252, 245, 0.95)',
  },
});


