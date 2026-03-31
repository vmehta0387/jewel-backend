import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

const GLASS_CARD_IOS = 'rgba(255, 255, 255, 0.22)';
const GLASS_CARD_ANDROID = 'rgba(255, 255, 255, 0.12)';
const BORDER_IOS = '#7C6650';
const BORDER_ANDROID = 'rgba(124, 102, 80, 0.78)';

const StatCard: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <View style={styles.card}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
    {hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
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
  label: {
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default StatCard;
