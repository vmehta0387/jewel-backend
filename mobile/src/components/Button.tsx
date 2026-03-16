import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, ActivityIndicator } from 'react-native';
import { colors, radii, spacing } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

const Button: React.FC<{
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}> = ({ title, onPress, variant = 'primary', loading, disabled, style }) => {
  const stylesForVariant =
    variant === 'secondary'
      ? buttonStyles.secondary
      : variant === 'ghost'
        ? buttonStyles.ghost
        : buttonStyles.primary;

  const textStyles =
    variant === 'secondary'
      ? buttonStyles.secondaryText
      : variant === 'ghost'
        ? buttonStyles.ghostText
        : buttonStyles.primaryText;

  return (
    <TouchableOpacity
      style={[buttonStyles.base, stylesForVariant, style, disabled ? buttonStyles.disabled : null]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primaryDark} />
      ) : (
        <Text style={[buttonStyles.text, textStyles]} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const buttonStyles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    fontSize: 14,
    flexShrink: 1,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: '#fff',
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.primaryDark,
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Button;
