/**
 * ExportButton — triggers the two-file CSV export share-sheet (SET-03 / D-02).
 *
 * D-02: shares transactions.csv then jars.csv via expo-sharing.
 * expo-sharing shares one file at a time; the second share follows the first.
 *
 * Security: catch blocks never log tx details or amounts (CLAUDE.md / T-05-06).
 * Accessibility: button role, busy state, 44pt minimum tap target.
 */

import React, { useState } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  type PressableStateCallbackType,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { buildExportFiles } from '../export/exportRepo';

export function ExportButton(): React.JSX.Element {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { transactionsUri, jarsUri } = await buildExportFiles();
      // D-02: share both files — expo-sharing handles one file at a time
      await Sharing.shareAsync(transactionsUri, {
        UTI: 'public.comma-separated-values-text',
        mimeType: 'text/csv',
      });
      await Sharing.shareAsync(jarsUri, {
        UTI: 'public.comma-separated-values-text',
        mimeType: 'text/csv',
      });
    } catch {
      // Graceful failure — never crash, never log tx detail (CLAUDE.md / T-05-06)
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }: PressableStateCallbackType) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={() => void handleExport()}
      disabled={loading}
      accessibilityLabel={t('settings.export_label')}
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.surface} />
      ) : (
        <Text style={styles.label} allowFontScaling>
          {t('settings.export_label')}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // CLAUDE.md: 44pt minimum tap target
    margin: SPACING.md,
  },
  buttonPressed: {
    opacity: 0.75,
  },
  label: {
    ...TYPE.uiLabel,
    color: COLORS.surface,
  },
});
