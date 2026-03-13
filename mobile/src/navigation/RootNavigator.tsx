import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DesignsScreen from '../screens/DesignsScreen';
import DesignDetailScreen from '../screens/DesignDetailScreen';
import FinalizeDesignScreen from '../screens/FinalizeDesignScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import BranchTeamScreen from '../screens/BranchTeamScreen';
import type { UserRole } from '../types';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type DesignsStackParamList = {
  Designs: undefined;
  DesignDetail: { designId: string };
  FinalizeDesign: { designId: string };
};

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetail: { orderId: string };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();
const DesignsStack = createNativeStackNavigator<DesignsStackParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const Tabs = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
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
  <DesignsStack.Navigator>
    <DesignsStack.Screen name="Designs" component={DesignsScreen} options={{ title: 'Designs' }} />
    <DesignsStack.Screen name="DesignDetail" component={DesignDetailScreen} options={{ title: 'Design Detail' }} />
    <DesignsStack.Screen name="FinalizeDesign" component={FinalizeDesignScreen} options={{ title: 'Finalize Design' }} />
  </DesignsStack.Navigator>
);

const OrdersNavigator = () => (
  <OrdersStack.Navigator>
    <OrdersStack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
    <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Detail' }} />
  </OrdersStack.Navigator>
);

const AppTabs: React.FC<{ role?: UserRole }> = ({ role }) => (
  <Tabs.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      tabBarActiveTintColor: colors.primaryDark,
      tabBarInactiveTintColor: colors.textMuted,
    }}
  >
    <Tabs.Screen name="DesignsTab" component={DesignsNavigator} options={{ title: 'Designs' }} />
    <Tabs.Screen name="OrdersTab" component={OrdersNavigator} options={{ title: 'Orders' }} />
    {role === 'BRANCH_MANAGER' || role === 'COMPANY_ADMIN' ? (
      <Tabs.Screen name="TeamTab" component={BranchTeamScreen} options={{ title: 'Team' }} />
    ) : null}
  </Tabs.Navigator>
);

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
