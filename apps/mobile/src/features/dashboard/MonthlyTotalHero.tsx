/**
 * MonthlyTotalHero — Oswald displayXL hero number + sub-label.
 *
 * Per UI-SPEC §MonthlyTotalHero (display singleton; one element, one screen):
 *   number    = TYPE.displayXL (64pt Oswald Medium) + tabular-nums
 *   sub-label = TYPE.uiLabel COLORS.textMuted, 4pt below
 *
 * Money sign convention: dashboard always renders expense as a positive
 * "amount spent" — we pass amountCents=-totalCents into formatMoney so the
 * Intl.NumberFormat output is a clean "€123.45" without an explicit minus.
 *
 * Redesign Wave 2 (spec §2.1 MOTION.heroCountUp): the amount counts from the
 * previous total → the current total on mount and on month change (600ms
 * outCubic) via the motion vocabulary. reduce-motion → final number instantly.
 * Motion-only; the static screenshot (no motion) shows the settled total.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useMotion } from '@design/useMotion';
import { formatMoney } from '@lib/money';
import { quantizeCents } from './dashboardMotion';
import { formatMonthLabel } from './monthMath';
import type { MonthKey } from './types';

type Props = {
  readonly totalCents: number;
  readonly monthKey: MonthKey;
  readonly monthDirection?: number;
  readonly locale?: string;
  readonly currency?: string;
};

export function MonthlyTotalHero({
  totalCents,
  monthKey,
  monthDirection = 0,
  locale = 'en-IE',
  currency = 'EUR',
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const { withMotion, reduceMotion } = useMotion();

  const monthLabel = formatMonthLabel(monthKey, locale);
  const spentLabel = t('dashboard.total_spent_in', { month: monthLabel });

  // Animated cents → formatted string. Start from 0 on first mount; from the
  // previous settled total on subsequent month changes.
  const animatedCents = useSharedValue(0);
  const prevCentsRef = useRef(0);
  const [displayCents, setDisplayCents] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      // reduce-motion: settle on the final total immediately, no count-up.
      animatedCents.value = totalCents;
      prevCentsRef.current = totalCents;
      setDisplayCents(totalCents);
      return;
    }
    // JSI synchronous — the withTiming below reads this as its start value.
    animatedCents.value = prevCentsRef.current;
    animatedCents.value = withMotion(totalCents, 'heroCountUp');
    prevCentsRef.current = totalCents;
  }, [totalCents, animatedCents, withMotion, reduceMotion]);

  // Redesign Wave 2 — MOTION.sharedMonth: on month swipe the hero carries with
  // the donut (synced direction-aware translateX + opacity entrance) so they
  // read as one element moving. ±16pt per Checkpoint B. reduce-motion handled
  // by withMotion's instant path (matches the count-up above).
  const carryX = useSharedValue(0);
  const carryOpacity = useSharedValue(1);
  useEffect(() => {
    if (monthDirection === 0) return;
    carryX.value = monthDirection > 0 ? 16 : -16;
    carryOpacity.value = 0;
    carryX.value = withMotion(0, 'sharedMonth');
    carryOpacity.value = withMotion(1, 'sharedMonth');
  }, [monthKey, monthDirection, carryX, carryOpacity, withMotion]);

  const carryStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: carryX.value }],
    opacity: carryOpacity.value,
  }));

  // Mirror the SharedValue onto JS state for Intl formatting (Intl can't run
  // in a worklet). The worklet reads the raw value (quantize stays on JS —
  // quantizeCents needs totalCents which is JS-side); JS quantizes with an
  // exact-target snap so the final frame lands EXACTLY on totalCents (Task 10
  // Step 3 — no off-by-one when withTiming settles at e.g. 12344.9997).
  const applyCents = useCallback(
    (raw: number) => {
      setDisplayCents((prev) => {
        const next = quantizeCents(raw, totalCents);
        return next === prev ? prev : next;
      });
    },
    [totalCents],
  );
  useAnimatedReaction(
    () => animatedCents.value,
    (raw, prev) => {
      if (raw !== prev) runOnJS(applyCents)(raw);
    },
    // dep: rebuild on month change so the snap uses the current totalCents, not a stale mount closure
    [applyCents],
  );

  const formatted = formatMoney({ amountCents: displayCents, currency }, locale);
  const finalFormatted = formatMoney({ amountCents: totalCents, currency }, locale);

  return (
    <Animated.View style={[styles.container, carryStyle]}>
      <Animated.Text
        style={styles.number}
        accessibilityRole="text"
        // a11y label always reports the FINAL total (not the mid-count value).
        accessibilityLabel={`${spentLabel}: ${finalFormatted}`}
        allowFontScaling
        maxFontSizeMultiplier={1.3}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {formatted}
      </Animated.Text>
      <Text
        style={styles.sub}
        allowFontScaling
        maxFontSizeMultiplier={1.6}
        numberOfLines={2}
      >
        {spentLabel}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: SPACING.sm,
  },
  number: {
    ...TYPE.displayXL,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  sub: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },
});
