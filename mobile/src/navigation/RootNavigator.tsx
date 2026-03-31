import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoginScreen from '../screens/LoginScreen';
import DesignsScreen from '../screens/DesignsScreen';
import DesignDetailScreen from '../screens/DesignDetailScreen';
import CartScreen from '../screens/CartScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import BranchTeamScreen from '../screens/BranchTeamScreen';
import BranchEmployeeFormScreen from '../screens/BranchEmployeeFormScreen';
import BranchDashboardScreen from '../screens/BranchDashboardScreen';
import AiChatScreen from '../screens/AiChatScreen';
import type { UserRole } from '../types';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type DesignsStackParamList = {
  Designs: undefined;
  DesignDetail: { designId: string };
};

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetail: { orderId: string };
};

export type TeamStackParamList = {
  TeamList: undefined;
  BranchEmployeeForm: { mode: 'create' } | { mode: 'edit'; employeeId: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();
const DesignsStack = createNativeStackNavigator<DesignsStackParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const TeamStack = createNativeStackNavigator<TeamStackParamList>();
const Tabs = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
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
    <DesignsStack.Screen name="Designs" component={DesignsScreen} options={{ title: 'Designs' }} />
    <DesignsStack.Screen name="DesignDetail" component={DesignDetailScreen} options={{ title: 'Design Detail' }} />
  </DesignsStack.Navigator>
);

const OrdersNavigator = () => (
  <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
    <OrdersStack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
    <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Detail' }} />
  </OrdersStack.Navigator>
);

const TeamNavigator = () => (
  <TeamStack.Navigator screenOptions={{ headerShown: false }}>
    <TeamStack.Screen name="TeamList" component={BranchTeamScreen} options={{ title: 'Team' }} />
    <TeamStack.Screen name="BranchEmployeeForm" component={BranchEmployeeFormScreen} options={{ title: 'Employee' }} />
  </TeamStack.Navigator>
);

const AppTabs: React.FC<{ role?: UserRole }> = ({ role }) => {
  const insets = useSafeAreaInsets();
  const { itemCount } = useCart();

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          marginHorizontal: 0,
          marginBottom: 0,
          borderRadius: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          lineHeight: 12,
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
                return focused ? 'diamond' : 'diamond-outline';
              case 'OrdersTab':
                return focused ? 'receipt' : 'receipt-outline';
              case 'CartTab':
                return focused ? 'cart' : 'cart-outline';
              case 'AiTab':
                return focused ? 'sparkles' : 'sparkles-outline';
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
              {route.name === 'CartTab' && itemCount > 0 ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>{itemCount > 99 ? '99+' : String(itemCount)}</Text>
                </View>
              ) : null}
            </View>
          );
        },
      })}
    >
      {role === 'BRANCH_MANAGER' || role === 'SALES_REP' ? (
        <Tabs.Screen name="DashboardTab" component={BranchDashboardScreen} options={{ title: 'Dashboard' }} />
      ) : null}
      <Tabs.Screen name="DesignsTab" component={DesignsNavigator} options={{ title: 'Designs' }} />
      <Tabs.Screen name="OrdersTab" component={OrdersNavigator} options={{ title: 'Orders' }} />
      <Tabs.Screen name="CartTab" component={CartScreen} options={{ title: 'Cart' }} />
      <Tabs.Screen name="AiTab" component={AiChatScreen} options={{ title: 'AI' }} />
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
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    width: 36,
    height: 36,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    backgroundColor: 'rgba(255, 252, 245, 0.92)',
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

