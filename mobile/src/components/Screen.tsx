import React from 'react';
import { StyleSheet, ViewStyle, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  bgImage?: any;
}

const Screen: React.FC<ScreenProps> = ({ children, style, bgImage }) => (
  <ImageBackground
    source={bgImage || require('../../assets/soft_golden.png')}
    style={styles.container}
    resizeMode="cover"
  >
    <SafeAreaView style={[styles.safeArea, style]}>{children}</SafeAreaView>
  </ImageBackground>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF5E6', // Warm golden fallback to prevent load flashing
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default Screen;
