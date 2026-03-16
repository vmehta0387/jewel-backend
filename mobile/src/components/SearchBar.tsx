import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

const SearchBar: React.FC<{ placeholder: string; value: string; onChange: (value: string) => void }> = ({
  placeholder,
  value,
  onChange,
}) => {
  const [focused, setFocused] = useState(false);
  const borderColor = useMemo(() => (focused ? colors.primary : colors.border), [focused]);

  return (
    <View style={[styles.container, { borderColor }]}> 
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: '#fff',
  },
  input: {
    height: 36,
    color: colors.text,
  },
});

export default SearchBar;
