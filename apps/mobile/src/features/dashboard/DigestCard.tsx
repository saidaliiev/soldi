/**
 * DigestCard — "yesterday in money" editorial digest card.
 *
 * Layout (UI-SPEC §DigestCard, top → bottom):
 *   1. Prefix label  (TYPE.uiLabel, COLORS.textMuted)         "yesterday in money"
 *   2. Yesterday €   (TYPE.displayL Oswald 40pt, COLORS.accent, tabular-nums)
 *   3. Sparkline     (32pt Skia line, COLORS.accent)
 *   4. MoM phrase    (TYPE.editorialBody, COLORS.textSecondary)
 *
 * Container: RADIUS.lg, COLORS.surface bg, 1px borderSubtle hairline (no shadow
 * — Cold Minimal §1), SPACING.md padding, full width inset by parent SPACING.lg.
 *
 * D-08: this is a first-class dashboard section between the donut block and
 * the top-5 category rows — its own visual breath, not a footnote.
 *
 * D-07: editorial tone — the MoM phrase is the brand signal that separates
 * the SOLDI dashboard from generic fintech "Spending insights" cards.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@lib/money';
import { Sparkline } from './Sparkline';
import type { DigestData } from './useDigestData';

type Props = {
  readonly data: DigestData;
  readonly locale?: string;
  readonly currency?: string;
};

export function DigestCard({
  data,
  locale = 'en-IE',
  currency = 'EUR',
}: Props): React.JSX.Element {
  const { t } = useTranslation();

  const yesterdayLabel = t('dashboard.digest_yesterday_label');
  const yesterdayFormatted = formatMoney(
    { amountCents: data.yesterdayCents, currency },
    locale
  );
  const deltaFormatted = formatMoney(
    { amountCents: data.deltaCents, currency },
    locale
  );
  const phrase = t(data.phraseKey, { delta: deltaFormatted });

  return (
    <View
      style={styles.card}
      accessible={false}
      accessibilityRole="none"
    >
      <Text style={styles.prefix} allowFontScaling>
        {yesterdayLabel}
      </Text>
      <Text
        style={styles.total}
        accessibilityRole="text"
        accessibilityLabel={`${yesterdayLabel}: ${yesterdayFormatted}`}
        allowFontScaling
      >
        {yesterdayFormatted}
      </Text>
      <Sparkline data={data.last7Days} color={COLORS.accent} />
      <Text
        style={styles.phrase}
        accessibilityRole="text"
        accessibilityLabel={phrase}
        allowFontScaling
      >
        {phrase}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    // Cold Minimal §1: hairline border, no shadow on content surfaces.
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: SPACING.xs,
  },
  prefix: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
  },
  total: {
    ...TYPE.displayL,
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
  },
  phrase: {
    ...TYPE.editorialBody,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
});
