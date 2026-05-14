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
      >
        {formatted}
      </Text>
      <Text style={styles.sub} allowFontScaling>
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
