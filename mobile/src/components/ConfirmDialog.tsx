import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radii, shadows, spacing } from '../theme';

type ConfirmTone = 'default' | 'danger' | 'success';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const toneColor = (tone: ConfirmTone) => {
  if (tone === 'danger') return colors.danger;
  if (tone === 'success') return colors.success;
  return colors.primaryDark;
};

const toneIcon = (tone: ConfirmTone): keyof typeof Ionicons.glyphMap => {
  if (tone === 'danger') return 'trash-outline';
  if (tone === 'success') return 'checkmark-circle-outline';
  return 'help-circle-outline';
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  tone = 'default',
  loading = false,
  onCancel,
  onConfirm,
}) => {
  const accent = toneColor(tone);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={loading ? undefined : onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: `${accent}18`, borderColor: `${accent}40` }]}>
                <Ionicons name={toneIcon(tone)} size={22} color={accent} />
              </View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={onCancel}
                  activeOpacity={0.9}
                  disabled={loading}
                >
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.confirmBtn, { backgroundColor: accent }, loading ? styles.disabled : null]}
                  onPress={onConfirm}
                  activeOpacity={0.9}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmText}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 26, 21, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9E1D7',
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#DED4C8',
    backgroundColor: '#FAF8F5',
  },
  confirmBtn: {
    backgroundColor: colors.primaryDark,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.72,
  },
});

export default ConfirmDialog;
