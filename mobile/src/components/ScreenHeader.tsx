import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

const ScreenHeader: React.FC<{ title: string; subtitle?: string; rightSlot?: React.ReactNode }> = ({
  title,
  subtitle,
  rightSlot,
}) => (
  <View style={styles.container}>
    <View style={styles.textBlock}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
    </View>
    {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
  },
  rightSlot: {
    maxWidth: '45%',
    alignItems: 'flex-end',
    flexShrink: 1,
  },
});

export default ScreenHeader;
