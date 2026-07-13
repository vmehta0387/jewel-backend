import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { NotificationProvider } from './src/context/NotificationContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <RootNavigator />
            <StatusBar style="dark" />
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
