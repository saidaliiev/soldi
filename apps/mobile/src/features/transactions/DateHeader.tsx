/**
 * DateHeader — sticky header above each day's transaction group.
 *
 * UI-SPEC §DateHeader:
 *   36pt height; left label (Today / Yesterday / Intl short date);
 *   right daily expense subtotal in TYPE.uiLabel COLORS.textSecondary
 *   tabular-nums; 1pt bottom border textMuted @ 20%.
 *
 * formatDateHeader() returns the English literals "Today" / "Yesterday"
 * for the recency branches — this component swaps them for the i18n
 * translations before rendering.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@lib/money';

import { formatDateHeader } from './dateGrouping';

type Props = {
  readonly date: string; // YYYY-MM-DD
  readonly subtotalCents: number;
  readonly today?: Date;
  readonly currency?: string;
};

const BORDER_COLOR_SUFFIX = '33'; // 20% alpha

export function DateHeader({
  date,
  subtotalCents,
  today,
  currency = 'EUR',
}: Props): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const todayDate = today ?? new Date();
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-IE';

  const raw = formatDateHeader(date, todayDate, locale);
  const label =
    raw === 'Today'
      ? t('transactions.header_today')
      : raw === 'Yesterday'
        ? t('transactions.header_yesterday')
        : raw;

  const subtotalFormatted = formatMoney(
    { amountCents: subtotalCents, currency },
    locale,
  );

  return (
    <View
      style={styles.row}
      accessibilityRole="header"
      accessibilityLabel={`${label}, ${subtotalFormatted}`}
    >
      <Text style={styles.label} allowFontScaling>
        {label}
      </Text>
      <Text style={styles.subtotal} allowFontScaling>
        {subtotalFormatted}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.textMuted}${BORDER_COLOR_SUFFIX}`,
  },
  label: {
    ...TYPE.uiLabel,
    color: COLORS.textPrimary,
  },
  subtotal: {
    ...TYPE.uiLabel,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
