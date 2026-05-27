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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { ChatLaunchFAB, FAB_SIZE } from '@/src/features/chat/ChatLaunchFAB';
import { GearIcon } from '@/src/design/icons/system/GearIcon';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_FLOATING_MARGIN,
} from '@/src/features/chrome/GlassTabBar';

import { COLORS, GRADIENTS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { getMonthlyExpenseTotal, getMonthsWithTransactions } from '@data/dashboardRepo';
import { MonthSwiper } from '@/src/features/dashboard/MonthSwiper';
import { MonthlyTotalHero } from '@/src/features/dashboard/MonthlyTotalHero';
import { DonutChart } from '@/src/features/dashboard/DonutChart';
import { CategoryRow } from '@/src/features/dashboard/CategoryRow';
import { EmptyState } from '@/src/features/dashboard/EmptyState';
import { DigestCard } from '@/src/features/dashboard/DigestCard';
import { useMonthData } from '@/src/features/dashboard/useMonthData';
import { useDigestData } from '@/src/features/dashboard/useDigestData';
import { addMonths, formatMonthLabel, isFutureMonth, isSameMonth, compareMonth } from '@/src/features/dashboard/monthMath';
import type { MonthKey } from '@/src/features/dashboard/types';
import { formatMoney } from '@lib/money';

function currentMonthKey(today: Date = new Date()): MonthKey {
  return {
    year: today.getUTCFullYear(),
    month: today.getUTCMonth() + 1,
  };
}

export default function DashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

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

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const prevSelectedRef = useRef<MonthKey>(selected);
  const monthDirection = useMemo(() => {
    const dir = compareMonth(selected, prevSelectedRef.current);
    prevSelectedRef.current = selected;
    return dir; // +1 = moved to a later month, -1 = earlier, 0 = no change
  }, [selected]);

  const isFuture = useMemo(() => isFutureMonth(selected, today), [selected, today]);
  const showDigest = useMemo(() => isSameMonth(selected, today), [selected, today]);

  // ---------------------------------------------------------------------------
  // Hero subline (D4) — "€X less / more than [prev month]" or first-month fallback
  // ---------------------------------------------------------------------------

  const [prevTotalCents, setPrevTotalCents] = useState<number>(0);
  useEffect(() => {
    try {
      const prev = addMonths(selected, -1);
      setPrevTotalCents(getMonthlyExpenseTotal(prev.year, prev.month));
    } catch {
      setPrevTotalCents(0);
    }
  }, [selected, data.totalCents]);

  const heroSubline = useMemo<string | null>(() => {
    if (isFuture) return null;
    if (data.totalCents === 0) return null;
    const prev = addMonths(selected, -1);
    if (prevTotalCents === 0) {
      const earliestSelected = compareMonth(selected, bounds.earliest) === 0;
      return earliestSelected ? t('dashboard.hero_first_month') : null;
    }
    const prevLabel = formatMonthLabel(prev, 'en-IE');
    const delta = data.totalCents - prevTotalCents;
    const absDelta = Math.abs(delta);
    const fmtDelta = formatMoney({ amountCents: absDelta, currency: 'EUR' }, 'en-IE');
    if (absDelta < 100) return t('dashboard.hero_same_as', { prevMonth: prevLabel });
    return delta < 0
      ? t('dashboard.hero_less_than', { delta: fmtDelta, prevMonth: prevLabel })
      : t('dashboard.hero_more_than', { delta: fmtDelta, prevMonth: prevLabel });
  }, [isFuture, data.totalCents, prevTotalCents, selected, bounds.earliest, t]);

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
    <SafeAreaView style={styles.safe} edges={['left', 'right']} accessibilityLabel="Dashboard screen">
      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            // Sprint E2: clear the floating tab bar so the last category row
            // (e.g. "Clothing") isn't clipped. The tab bar is absolutely
            // positioned with TAB_BAR_FLOATING_MARGIN + insets.bottom of
            // bottom inset, so total clearance below content is
            // height + margin + safe-area + breathing gap. Sprint F follow-up:
            // also reserve FAB_SIZE so the right-aligned amounts on the last
            // row aren't obscured by the ChatLaunchFAB overlay (Coffee
            // €1,892.24 clipped on 2026-05-27 smoke).
            paddingBottom:
              TAB_BAR_HEIGHT +
              TAB_BAR_FLOATING_MARGIN +
              insets.bottom +
              FAB_SIZE +
              SPACING.md,
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Hero band (D4) — warm gradient wrapping swiper + monthly total. */}
        <LinearGradient
          colors={[...GRADIENTS.warm]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={[styles.heroBand, { paddingTop: insets.top + SPACING.sm }]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroSwiperWrap}>
              <MonthSwiper
                selected={selected}
                onChange={setSelected}
                earliest={bounds.earliest}
                latestPlusOne={bounds.latestPlusOne}
              />
            </View>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel={t('settings.open_a11y')}
              style={styles.gearButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <GearIcon color={COLORS.textSecondary} size={24} />
            </Pressable>
          </View>
          <MonthlyTotalHero
            totalCents={data.totalCents}
            monthKey={selected}
            monthDirection={monthDirection}
            subline={heroSubline}
          />
        </LinearGradient>

        <View style={styles.belowHero}>
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
              <View style={styles.donutBridge}>
                <DonutChart breakdown={data.breakdown} monthDirection={monthDirection} />
              </View>
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
                  />
                ))}
                {data.breakdown.other != null && (
                  <CategoryRow
                    key="other"
                    slice={data.breakdown.other}
                  />
                )}
              </View>
            </>
          )}
        </View>
      </Animated.ScrollView>
      {/* ChatLaunchFAB — absolute overlay; scroll-driven reveal via scrollY (Wave 2) */}
      <ChatLaunchFAB scrollY={scrollY} />
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
    gap: SPACING.lg,
  },
  heroBand: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  heroSwiperWrap: {
    flex: 1,
  },
  gearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  belowHero: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
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
  // Pull the donut UP into the hero band's lower edge so the donut center
  // sits on the band seam — turns the previous dead-space drift into a
  // deliberate visual handshake between hero and breakdown (#P0-2,
  // 2026-05-27). Donut canvas is 200pt with internal marginVertical:md;
  // -xl shaves enough off the stacked heroBand.paddingBottom (xl) +
  // belowHero.paddingTop (lg) to bring the donut close without overlapping
  // the hero subline.
  donutBridge: {
    marginTop: -SPACING.xl,
    marginBottom: -SPACING.sm,
  },
  digestWrap: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
  },
});
