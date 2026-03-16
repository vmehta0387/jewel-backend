import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

const Screen: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <SafeAreaView style={[styles.container, style]}>{children}</SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default Screen;
