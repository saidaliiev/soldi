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

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useMotion } from '@design/useMotion';
import { formatMoney } from '@lib/money';
import { formatMonthLabel } from './monthMath';
import type { MonthKey } from './types';

type Props = {
  readonly totalCents: number;
  readonly monthKey: MonthKey;
  readonly locale?: string;
  readonly currency?: string;
};

export function MonthlyTotalHero({
  totalCents,
  monthKey,
  locale = 'en-IE',
  currency = 'EUR',
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const { withMotion } = useMotion();

  const monthLabel = formatMonthLabel(monthKey, locale);
  const spentLabel = t('dashboard.total_spent_in', { month: monthLabel });

  // Animated cents → formatted string. Start from 0 on first mount; from the
  // previous settled total on subsequent month changes.
  const animatedCents = useSharedValue(0);
  const prevCentsRef = useRef(0);
  const [displayCents, setDisplayCents] = useState(0);

  useEffect(() => {
    animatedCents.value = prevCentsRef.current; // settle at the start point
    animatedCents.value = withMotion(totalCents, 'heroCountUp');
    prevCentsRef.current = totalCents;
  }, [totalCents, animatedCents, withMotion]);

  // Mirror the SharedValue onto JS state for Intl formatting (Intl can't run
  // in a worklet). Quantize to whole cents so duplicate frames skip setState.
  useAnimatedReaction(
    () => Math.round(animatedCents.value),
    (cents, prev) => {
      if (cents !== prev) runOnJS(setDisplayCents)(cents);
    },
    [],
  );

  const formatted = formatMoney({ amountCents: displayCents, currency }, locale);
  const finalFormatted = formatMoney({ amountCents: totalCents, currency }, locale);

  return (
    <View style={styles.container}>
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
    </View>
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
