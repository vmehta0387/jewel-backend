import React, { useCallback, useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, StackActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { fetchOrders } from '../api/orders';
import LoginScreen from '../screens/LoginScreen';
import CatalogCategoryScreen from '../screens/CatalogCategoryScreen';
import DesignsScreen from '../screens/DesignsScreen';
import DesignDetailScreen from '../screens/DesignDetailScreen';
import QuoteBuilderScreen from '../screens/QuoteBuilderScreen';
import QuoteSummaryScreen from '../screens/QuoteSummaryScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import BranchTeamScreen from '../screens/BranchTeamScreen';
import BranchEmployeeFormScreen from '../screens/BranchEmployeeFormScreen';
import BranchRepProfileScreen from '../screens/BranchRepProfileScreen';
import BranchDashboardScreen from '../screens/BranchDashboardScreen';
import SpiffRewardsScreen from '../screens/SpiffRewardsScreen';
import AiChatScreen from '../screens/AiChatScreen';
import type { BranchEmployee, UserRole } from '../types';
import { buildOrderNotifications } from '../utils/orderNotifications';
import { loadSeenNotificationIds } from '../utils/notificationReadState';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type CatalogPresetCategory = 'rings' | 'bracelets' | 'studs' | 'necklaces';

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
  purchaseOrderNumber?: string;
  notes?: string;
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
  purchaseOrderNumber?: string;
  branchName?: string;
  notes?: string;
};

export type DesignsStackParamList = {
  CatalogCategories: undefined;
  Designs: { presetCategory?: CatalogPresetCategory; prefillSearch?: string } | undefined;
  DesignDetail: { designId: string };
  QuoteBuilder: { draft: QuoteBuilderDraft };
  QuoteSummary: { summary: QuoteSummaryPayload };
};

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetail: { orderId: string };
  QuoteSummary: { summary: QuoteSummaryPayload };
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  SpiffRewards: undefined;
};

export type TeamStackParamList = {
  TeamList: undefined;
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

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
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
    <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Detail' }} />
    <OrdersStack.Screen name="QuoteSummary" component={QuoteSummaryScreen} options={{ title: 'Order Summary' }} />
  </OrdersStack.Navigator>
);

const DashboardNavigator = () => (
  <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
    <DashboardStack.Screen name="DashboardHome" component={BranchDashboardScreen} options={{ title: 'Dashboard' }} />
    <DashboardStack.Screen name="SpiffRewards" component={SpiffRewardsScreen} options={{ title: 'Spiff Rewards' }} />
  </DashboardStack.Navigator>
);

const TeamNavigator = () => (
  <TeamStack.Navigator screenOptions={{ headerShown: false }}>
    <TeamStack.Screen name="TeamList" component={BranchTeamScreen} options={{ title: 'Team' }} />
    <TeamStack.Screen name="BranchRepProfile" component={BranchRepProfileScreen} options={{ title: 'Rep Profile' }} />
    <TeamStack.Screen name="BranchEmployeeForm" component={BranchEmployeeFormScreen} options={{ title: 'Employee' }} />
  </TeamStack.Navigator>
);

const AppTabs: React.FC<{ role?: UserRole }> = ({ role }) => {
  const insets = useSafeAreaInsets();
  const tabBarBottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 14) : insets.bottom;
  const tabBarHeight = Platform.OS === 'android' ? 62 + tabBarBottomInset : 60 + tabBarBottomInset;
  const { token, user } = useAuth();
  const [ordersBadgeCount, setOrdersBadgeCount] = useState(0);

  const loadOrdersBadge = useCallback(async () => {
    if (!token || !user || (role !== 'BRANCH_MANAGER' && role !== 'SALES_REP')) {
      setOrdersBadgeCount(0);
      return;
    }

    try {
      const response = await fetchOrders(token, 1, 100, 'ALL');
      const summary = buildOrderNotifications(response.data || [], user);
      const seen = await loadSeenNotificationIds(user.id);
      const unread = summary.items.filter((item) => !seen.has(item.id)).length;
      setOrdersBadgeCount(unread);
    } catch {
      setOrdersBadgeCount(0);
    }
  }, [token, user, role]);

  useEffect(() => {
    loadOrdersBadge();
    const interval = setInterval(loadOrdersBadge, 8000);
    return () => clearInterval(interval);
  }, [loadOrdersBadge]);

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
              case 'DesignsTab':
                return focused ? 'search' : 'search-outline';
              case 'OrdersTab':
                return focused ? 'receipt' : 'receipt-outline';
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
              {route.name === 'OrdersTab' && ordersBadgeCount > 0 ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>
                    {ordersBadgeCount > 99 ? '99+' : String(ordersBadgeCount)}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        },
      })}
    >
      {role === 'BRANCH_MANAGER' || role === 'SALES_REP' ? (
        <Tabs.Screen name="DashboardTab" component={DashboardNavigator} options={{ title: 'Dashboard' }} />
      ) : null}
      <Tabs.Screen
        name="DesignsTab"
        component={DesignsNavigator}
        options={{ title: 'Catalog', popToTopOnBlur: true }}
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            event.preventDefault();

            const state = (route as any).state;
            if (state?.type === 'stack' && state.key && state.index > 0) {
              navigation.dispatch({
                ...StackActions.popToTop(),
                target: state.key,
              });
            }

            (navigation as any).navigate('DesignsTab', {
              screen: 'CatalogCategories',
            });
          },
        })}
      />
      <Tabs.Screen name="OrdersTab" component={OrdersNavigator} options={{ title: 'Orders' }} />
      <Tabs.Screen name="AiTab" component={AiChatScreen} options={{ title: 'AI Sales' }} />
      {role === 'BRANCH_MANAGER' || role === 'COMPANY_ADMIN' ? (
        <Tabs.Screen name="TeamTab" component={TeamNavigator} options={{ title: 'Team' }} />
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

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
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
  badgePill: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A67F3F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  badgePillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
