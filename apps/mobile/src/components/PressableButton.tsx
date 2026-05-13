/**
 * PressableButton — reusable Pressable button with token-only styling.
 *
 * Design rules:
 * - Minimum 44pt tap target height (CLAUDE.md).
 * - accessibilityRole 'button' + accessibilityLabel on every interactive element.
 * - All colours from COLORS tokens — no inline hex.
 * - StyleSheet.create only — no inline style objects.
 */

import React from 'react';
import { Pressable, Text, StyleSheet, type PressableStateCallbackType } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PressableButtonProps = {
  /** Button label text — also used as fallback accessibilityLabel. */
  label: string;
  onPress: () => void;
  /** 'primary' uses accent background; 'secondary' uses surface background. */
  variant?: 'primary' | 'secondary';
  /** Override accessibilityLabel. Defaults to label. */
  accessibilityLabel?: string;
  testID?: string;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PressableButton({
  label,
  onPress,
  variant = 'primary',
  accessibilityLabel,
  testID,
  disabled = false,
}: PressableButtonProps): React.JSX.Element {
  const containerStyle =
    variant === 'primary' ? styles.containerPrimary : styles.containerSecondary;
  const textStyle =
    variant === 'primary' ? styles.textPrimary : styles.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.base,
        containerStyle,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles — token-only, no inline hex
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  containerPrimary: {
    backgroundColor: COLORS.accent,
  },
  containerSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.textMuted,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.4,
  },
  textPrimary: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
  textSecondary: {
    ...TYPE.uiButton,
    color: COLORS.textPrimary,
  },
});
