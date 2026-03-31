import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

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
