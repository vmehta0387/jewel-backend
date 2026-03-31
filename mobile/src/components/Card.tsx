import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { radii, spacing } from '../theme';

const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.3,
    borderColor: '#7C6650',
    shadowColor: '#6E533D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 2,
  },
});

export default Card;
