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
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
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
  const formatted = formatMoney({ amountCents: totalCents, currency }, locale);
  const monthLabel = formatMonthLabel(monthKey, locale);

  return (
    <View style={styles.container}>
      <Text
        style={styles.number}
        accessibilityRole="text"
        accessibilityLabel={`Total spent in ${monthLabel}: ${formatted}`}
        allowFontScaling
        // QUAL-04: Oswald 64pt hero number — cap at 1.3× so AccessibilityXXXL
        // (system scale ≈ 3.1×) renders at ~83pt instead of 198pt, which still
        // fits the hero band. adjustsFontSizeToFit + numberOfLines={1} ensure the
        // number shrinks-to-fit the container width rather than clipping or
        // wrapping when the amount string is long (e.g. "€10,523.45").
        maxFontSizeMultiplier={1.3}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {formatted}
      </Text>
      <Text
        style={styles.sub}
        allowFontScaling
        // QUAL-04: sub-label is uiLabel (14pt) — cap at 1.6× (≈22pt) so the
        // label remains visible without breaking the hero container layout.
        maxFontSizeMultiplier={1.6}
        numberOfLines={2}
      >
        {`Total spent in ${monthLabel}`}
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
