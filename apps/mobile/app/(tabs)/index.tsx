/**
 * SOLDI Phase 1 minimal dashboard.
 *
 * Intentionally austere — proves the full data path works end-to-end:
 *   onboarding → synthetic generator → op-sqlite → read back → display.
 *
 * Phase 2 replaces this with the full SOLDI design (Skia charts, FlashList,
 * category breakdown, etc.). Do NOT add Skia, FlashList, or chart code here.
 *
 * Design rules:
 * - Oswald TYPE.displayL for the section title
 * - TYPE.displayXL for the monthly total (hero number)
 * - Manrope TYPE.uiLabel for counts and labels
 * - COLORS.expense for expense total, COLORS.textMuted for empty state
 * - No hardcoded hex. No inline style objects except for dynamic values.
 * - Minimum tap targets: N/A (no interactive elements in Phase 1 dashboard)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@lib/money';
import { countTransactions, sumLastNDays } from '@data/transactionsRepo';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();

  const [count, setCount] = useState<number>(0);
  const [sumLast30Cents, setSumLast30Cents] = useState<number>(0);

  // ---------------------------------------------------------------------------
  // Data load — re-fetches whenever this tab comes into focus
  // ---------------------------------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      try {
        const txCount = countTransactions();
        const expenseSum = sumLastNDays(30);
        setCount(txCount);
        setSumLast30Cents(expenseSum);
      } catch {
        // On error: show empty state (count stays 0)
        setCount(0);
        setSumLast30Cents(0);
      }
    }, [])
  );

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  const formattedTotal = formatMoney(
    { amountCents: -sumLast30Cents, currency: 'EUR' },
    'en-IE'
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView
      style={styles.safeArea}
      accessibilityLabel="Dashboard screen"
    >
      <View style={styles.container}>

        <Text
          style={styles.title}
          accessibilityRole="header"
        >
          {t('dashboard.this_month')}
        </Text>

        {count === 0 ? (
          // Empty state
          <View
            style={styles.emptyContainer}
            accessibilityLabel="No transactions loaded yet"
          >
            <Text style={styles.emptyText}>
              {t('dashboard.empty')}
            </Text>
          </View>
        ) : (
          // Summary card
          <View style={styles.card} accessibilityLabel="Monthly summary card">
            <Text
              style={styles.totalAmount}
              accessibilityLabel={`Monthly expenses: ${formattedTotal}`}
            >
              {formattedTotal}
            </Text>
            <Text style={styles.txCount}>
              {t('dashboard.transactions_count', { n: count })}
            </Text>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  title: {
    ...TYPE.displayL,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  totalAmount: {
    ...TYPE.displayXL,
    color: COLORS.expense,
    marginBottom: SPACING.sm,
  },
  txCount: {
    ...TYPE.uiLabel,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...TYPE.editorialLead,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
