import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { radii, spacing } from '../theme';

const GLASS_CARD_IOS = 'rgba(255, 255, 255, 0.22)';
const GLASS_CARD_ANDROID = 'rgba(255, 255, 255, 0.12)';
const BORDER_IOS = '#7C6650';
const BORDER_ANDROID = 'rgba(124, 102, 80, 0.78)';

const Card: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Platform.OS === 'android' ? GLASS_CARD_ANDROID : GLASS_CARD_IOS,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.3,
    borderColor: Platform.OS === 'android' ? BORDER_ANDROID : BORDER_IOS,
    shadowColor: '#6E533D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 0 : 2,
  },
});

export default Card;
