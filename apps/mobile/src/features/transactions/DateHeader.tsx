/**
 * DateHeader — sticky eyebrow above each day's transaction group.
 *
 * Wave 3 design-sync (soldify-screens.html:221, checkpoint RESOLVED
 * 2026-05-19): an uppercase tracked Manrope eyebrow (moss/sageDark) followed
 * by a hairline rule that extends to the right edge. The prior daily-expense
 * subtotal was DROPPED to match the design-path-C authority (overrides the
 * earlier UI-SPEC §DateHeader subtotal).
 *
 * formatDateHeader() returns the English literals "Today" / "Yesterday"
 * for the recency branches — this component swaps them for the i18n
 * translations before rendering. Sticky over scrolling rows, so the row
 * keeps an opaque COLORS.background fill (functional; the static mockup
 * does not show this).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';

import { formatDateHeader } from './dateGrouping';

type Props = {
  readonly date: string; // YYYY-MM-DD
  readonly today?: Date;
};

// Delicate hairline rule: textMuted at ~15% — matches the codebase
// `${COLORS.textMuted}<alpha>` convention (no central hairline token).
const HAIRLINE_ALPHA = '26';

export function DateHeader({ date, today }: Props): React.JSX.Element {
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

  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={label}>
      <Text style={styles.eyebrow} numberOfLines={1} allowFontScaling>
        {label}
      </Text>
      <View style={styles.hairline} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.background,
  },
  eyebrow: {
    ...TYPE.uiMeta,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.sageDark,
  },
  hairline: {
    flex: 1,
    height: 1,
    backgroundColor: `${COLORS.textMuted}${HAIRLINE_ALPHA}`,
  },
});
