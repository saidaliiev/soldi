/**
 * CSV import onboarding screen.
 *
 * State machine: 'idle' → 'picking' → 'previewing' → 'inserting' → 'done' | 'error' | 'mapping-failed'
 *
 * Security / robustness:
 * - File size checked before fetch (asset.size field from expo-document-picker).
 * - parseCsv caps at 5MB + 200k rows.
 * - detectColumns returns null for unrecognised formats → 'mapping-failed' state.
 * - B4: zero-row guard — if result.inserted === 0 AND finalRows.length > 0 → explicit error.
 * - description is never stored (Phase 1 AI safety).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getDocumentAsync } from 'expo-document-picker';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';
import { PressableButton } from '@components/PressableButton';

import { parseCsv, CsvParseError } from '@lib/csv/parser';
import { detectColumns, csvRowsToTransactions, type ColumnMap } from '@lib/csv/mappers';
import { insertManyTransactions } from '@data/transactionsRepo';
import { getCategoryIdBySlug } from '@data/categoriesRepo';
import { ensureDefaultAccount } from '@data/accountsRepo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | 'idle'
  | 'picking'
  | 'previewing'
  | 'mapping-failed'
  | 'inserting'
  | 'done'
  | 'error';

// ---------------------------------------------------------------------------
// CsvScreen
// ---------------------------------------------------------------------------

export default function CsvScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('idle');
  const [errMsg, setErrMsg] = useState('');

  // Parsed state — kept while previewing
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap | null>(null);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewUsable, setPreviewUsable] = useState(0);

  const handlePick = async () => {
    setPhase('picking');

    let asset: { uri: string; name: string; size?: number; mimeType?: string | null } | null = null;

    try {
      const result = await getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.ms-excel',
          'text/plain',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setPhase('idle');
        return;
      }

      asset = result.assets[0] ?? null;
      if (asset === null) {
        setPhase('idle');
        return;
      }
    } catch {
      setErrMsg(t('onboarding.csv_unparseable'));
      setPhase('error');
      return;
    }

    // Size guard before fetch
    if (asset.size !== undefined && asset.size > 5_000_000) {
      setErrMsg(t('onboarding.csv_too_large'));
      setPhase('error');
      return;
    }

    // Read file using fetch on the document-picker URI (works on iOS for file:// URIs)
    let text: string;
    try {
      const resp = await globalThis.fetch(asset.uri);
      text = await resp.text();
    } catch {
      setErrMsg(t('onboarding.csv_unparseable'));
      setPhase('error');
      return;
    }

    // Parse CSV
    let rows: string[][];
    try {
      rows = parseCsv(text, { maxBytes: 5_000_000, maxRows: 200_000 });
    } catch (err) {
      if (err instanceof CsvParseError) {
        if (err.code === 'too-large') {
          setErrMsg(t('onboarding.csv_too_large'));
        } else {
          setErrMsg(t('onboarding.csv_unparseable'));
        }
      } else {
        setErrMsg(t('onboarding.csv_unparseable'));
      }
      setPhase('error');
      return;
    }

    if (rows.length === 0) {
      setErrMsg(t('onboarding.csv_unparseable'));
      setPhase('error');
      return;
    }

    // Detect columns
    const cmap = detectColumns(rows[0] ?? []);
    if (cmap === null) {
      setErrMsg(t('onboarding.csv_mapping_failed'));
      setPhase('mapping-failed');
      return;
    }

    // Preview: count total + usable rows
    const usableRows = csvRowsToTransactions(rows, cmap, 0, 'EUR');
    setPreviewTotal(rows.length - 1); // subtract header
    setPreviewUsable(usableRows.length);
    setParsedRows(rows);
    setColumnMap(cmap);
    setPhase('previewing');
  };

  const handleImport = () => {
    if (columnMap === null || parsedRows.length === 0) return;

    setPhase('inserting');

    const accountId = ensureDefaultAccount('csv');

    const mapped = csvRowsToTransactions(parsedRows, columnMap, accountId, 'EUR');

    // Resolve category_id for each row; filter those without a valid category
    const finalRows = mapped
      .map((r) => ({
        amount_cents: r.amount_cents,
        currency: r.currency,
        merchant_name: r.merchant_name,
        merchant_id: r.merchant_id,
        mcc_code: r.mcc_code,
        category_id: getCategoryIdBySlug(r.categorySlug),
        account_id: accountId,
        description: r.description,
        date: r.date,
        source: r.source,
        external_id: r.external_id,
        created_at: r.created_at,
      }))
      .filter((r) => r.category_id !== null);

    const result = insertManyTransactions(
      finalRows as Parameters<typeof insertManyTransactions>[0][number][],
    );

    // B4: Defensive zero-row check — never silently navigate to empty dashboard
    if (result.inserted === 0 && finalRows.length > 0) {
      setPhase('error');
      setErrMsg(t('onboarding.csv_no_rows_imported'));
      return;
    }

    useOnboardingStore.getState().setDataSource('csv');
    useOnboardingStore.getState().setCompleted(true);
    router.replace('/(tabs)');
  };

  const handleRetry = () => {
    setErrMsg('');
    setParsedRows([]);
    setColumnMap(null);
    setPhase('idle');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Explainer */}
        <Text style={styles.explainer}>
          {t('onboarding.csv_explainer')}
        </Text>

        {/* Idle: pick button */}
        {phase === 'idle' && (
          <PressableButton
            label={t('onboarding.csv_pick')}
            onPress={() => { void handlePick(); }}
            accessibilityLabel={t('onboarding.csv_pick')}
            testID="csv-pick-button"
          />
        )}

        {/* Picking: loading indicator */}
        {phase === 'picking' && (
          <Text style={styles.statusText}>{t('onboarding.csv_pick')}...</Text>
        )}

        {/* Previewing: row count + import */}
        {phase === 'previewing' && (
          <View style={styles.card}>
            <Text style={styles.previewText}>
              {t('onboarding.csv_preview', {
                rows: previewTotal,
                usable: previewUsable,
              })}
            </Text>
            <View style={styles.buttonRow}>
              <PressableButton
                label={t('onboarding.csv_import')}
                onPress={handleImport}
                accessibilityLabel={t('onboarding.csv_import')}
                testID="csv-import-button"
              />
            </View>
            <View style={styles.retryRow}>
              <PressableButton
                label={t('onboarding.csv_pick')}
                onPress={() => { void handlePick(); }}
                variant="secondary"
                accessibilityLabel={t('onboarding.csv_pick')}
              />
            </View>
          </View>
        )}

        {/* Inserting: progress */}
        {phase === 'inserting' && (
          <Text style={styles.statusText}>{t('onboarding.csv_import')}...</Text>
        )}

        {/* Mapping failed */}
        {phase === 'mapping-failed' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errMsg}</Text>
            <View style={styles.retryRow}>
              <PressableButton
                label={t('onboarding.csv_pick')}
                onPress={handleRetry}
                variant="secondary"
                accessibilityLabel={t('onboarding.csv_pick')}
                testID="csv-retry-button"
              />
            </View>
          </View>
        )}

        {/* Error */}
        {phase === 'error' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errMsg}</Text>
            <View style={styles.retryRow}>
              <PressableButton
                label={t('onboarding.csv_pick')}
                onPress={handleRetry}
                variant="secondary"
                accessibilityLabel={t('onboarding.csv_pick')}
                testID="csv-retry-button"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles — token-only, no inline hex
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  explainer: {
    ...TYPE.editorialBody,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
    marginBottom: SPACING.lg,
  },
  previewText: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statusText: {
    ...TYPE.editorialBody,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: SPACING.xl,
  },
  errorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    ...TYPE.uiBody,
    color: COLORS.error,
    marginBottom: SPACING.md,
  },
  buttonRow: {
    marginBottom: SPACING.sm,
  },
  retryRow: {
    marginTop: SPACING.sm,
  },
});
