import React from 'react';
import { StyleSheet, ViewStyle, View, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  bgImage?: any;
  includeBottomInset?: boolean;
}

const Screen: React.FC<ScreenProps> = ({ children, style, bgImage, includeBottomInset = false }) => {
  if (bgImage) {
    return (
      <ImageBackground source={bgImage} style={styles.container} resizeMode="cover">
        <SafeAreaView
          edges={includeBottomInset ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
          style={[styles.safeArea, style]}
        >
          {children}
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView
        edges={includeBottomInset ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
        style={[styles.safeArea, style]}
      >
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default Screen;
