/**
 * SOLDI TextField — reusable text input with label, error state, a11y.
 *
 * Design rules:
 * - Minimum 44pt tap target (minHeight: 44).
 * - accessibilityRole 'none' on wrapper, accessibilityLabel on TextInput.
 * - All colours from COLORS tokens — no inline hex.
 * - StyleSheet.create only — no inline style objects.
 * - secureTextEntry support for token/password inputs.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type KeyboardTypeOptions,
} from 'react-native';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  accessibilityLabel?: string;
  testID?: string;
  error?: string | null;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  accessibilityLabel,
  testID,
  error,
}: TextFieldProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType="done"
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
      {error != null && error.length > 0 && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles — token-only, no inline hex
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.sm,
  },
  label: {
    ...TYPE.uiLabel,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 44,
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  errorText: {
    ...TYPE.uiMeta,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
});
