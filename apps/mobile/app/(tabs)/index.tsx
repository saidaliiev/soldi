/**
 * SOLDI Phase 2 Dashboard.
 *
 * Replaces the Phase 1 minimal dashboard with the editorial composition
 * per D-01:
 *   MonthSwiper → MonthlyTotalHero → DonutChart + CategoryRows → EmptyState
 *
 * Implementation notes:
 *   - Synchronous data read via useFocusEffect (D-27, Phase 1 pattern).
 *   - Past-lock = month of earliest transaction (from getMonthsWithTransactions).
 *   - Future-lock = today + 1 month inclusive (D-02).
 *   - Future month → EmptyState 'future-month'. Empty current month → 'current-month'.
 *   - The digest card + sparkline + dynamic month-change donut interpolation
 *     are deferred to plan 02-02 (per scope in 02-01-PLAN).
 *
 * Security (T-02-01-03): no transaction details ever logged. The dev-only
 * `console.time('donut-first-frame')` instrumentation is the only console
 * call in this path.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChatLaunchFAB } from '@/src/features/chat/ChatLaunchFAB';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { getMonthsWithTransactions } from '@data/dashboardRepo';
import { MonthSwiper } from '@/src/features/dashboard/MonthSwiper';
import { MonthlyTotalHero } from '@/src/features/dashboard/MonthlyTotalHero';
import { DonutChart } from '@/src/features/dashboard/DonutChart';
import { CategoryRow } from '@/src/features/dashboard/CategoryRow';
import { EmptyState } from '@/src/features/dashboard/EmptyState';
import { DigestCard } from '@/src/features/dashboard/DigestCard';
import { useMonthData } from '@/src/features/dashboard/useMonthData';
import { useDigestData } from '@/src/features/dashboard/useDigestData';
import { addMonths, isFutureMonth, isSameMonth } from '@/src/features/dashboard/monthMath';
import type { MonthKey } from '@/src/features/dashboard/types';

function currentMonthKey(today: Date = new Date()): MonthKey {
  return {
    year: today.getUTCFullYear(),
    month: today.getUTCMonth() + 1,
  };
}

export default function DashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();

  const [today] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<MonthKey>(() => currentMonthKey(today));

  // ---------------------------------------------------------------------------
  // Month bounds (re-read on focus so a fresh import bumps the past-lock).
  // ---------------------------------------------------------------------------

  const [bounds, setBounds] = useState<{ earliest: MonthKey; latestPlusOne: MonthKey }>(() => ({
    earliest: currentMonthKey(today),
    latestPlusOne: addMonths(currentMonthKey(today), 1),
  }));

  useFocusEffect(
    useCallback(() => {
      try {
        const months = getMonthsWithTransactions();
        const cm = currentMonthKey(today);
        const earliest = months.length > 0 ? months[0]! : cm;
        const latestPlusOne = addMonths(cm, 1);
        setBounds({ earliest, latestPlusOne });
      } catch {
        // Defensive — never crash dashboard on bounds lookup failure.
        const cm = currentMonthKey(today);
        setBounds({ earliest: cm, latestPlusOne: addMonths(cm, 1) });
      }
    }, [today])
  );

  // ---------------------------------------------------------------------------
  // Selected-month data (auto-refresh on focus).
  // ---------------------------------------------------------------------------

  const data = useMonthData(selected);
  const digest = useDigestData();

  const isFuture = useMemo(() => isFutureMonth(selected, today), [selected, today]);
  const showDigest = useMemo(() => isSameMonth(selected, today), [selected, today]);

  const maxAmount = useMemo(() => {
    if (data.breakdown.top.length === 0) return 0;
    return Math.max(...data.breakdown.top.map((s) => s.amountCents));
  }, [data.breakdown.top]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const goAddTransaction = useCallback(() => {
    // Phase 1 manual-entry route — kept available for the empty-state CTA.
    router.push('/onboarding/manual');
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Dashboard screen">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <MonthSwiper
          selected={selected}
          onChange={setSelected}
          earliest={bounds.earliest}
          latestPlusOne={bounds.latestPlusOne}
        />

        <MonthlyTotalHero totalCents={data.totalCents} monthKey={selected} />

        {data.error && (
          <Pressable
            onPress={data.refresh}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.error_load')}
            style={styles.errorRow}
            hitSlop={8}
          >
            <Text style={styles.errorText} allowFontScaling>
              {t('dashboard.error_load')}
            </Text>
          </Pressable>
        )}

        {isFuture ? (
          <EmptyState variant="future-month" onCtaPress={goAddTransaction} />
        ) : data.totalCents === 0 ? (
          <EmptyState variant="current-month" onCtaPress={goAddTransaction} />
        ) : (
          <>
            <DonutChart breakdown={data.breakdown} />
            {showDigest && (
              <View style={styles.digestWrap}>
                <DigestCard data={digest} />
              </View>
            )}
            <View style={styles.rows}>
              {data.breakdown.top.map((slice) => (
                <CategoryRow
                  key={`top-${String(slice.categoryId)}`}
                  slice={slice}
                  maxAmountCents={maxAmount}
                />
              ))}
              {data.breakdown.other != null && (
                <CategoryRow
                  key="other"
                  slice={data.breakdown.other}
                  maxAmountCents={maxAmount}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
      {/* ChatLaunchFAB — absolute overlay; no scrollY SharedValue yet (Phase 5) */}
      <ChatLaunchFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  errorRow: {
    paddingVertical: SPACING.sm,
  },
  errorText: {
    ...TYPE.uiLabel,
    color: COLORS.error,
  },
  rows: {
    gap: SPACING.sm,
  },
  digestWrap: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
});
