/**
 * JarRow — presentational list row for a single non-featured jar (Wave 5).
 *
 * Layout (HTML §6 lines 374-385): mini 46pt progress ring left + name + meta
 * (balance/target) + moss-text percentage right-aligned + hairline below.
 * No card shadows on rows; the featured-jar card on JarListScreen carries
 * the SHADOWS.card. Ring palette alternates sage (≥50% progress) vs sageSoft
 * (<50%) — matches the HTML alternation between #687653 and #9AA585.
 *
 * Navigation: tap → /jars/[id] via expo-router.
 *
 * A11y: accessibilityRole="button", accessibilityLabel summarises
 *   "{name}, {balance} of {target}". Min tap target 56pt height.
 * Tokens only — no hardcoded hex, no BANNED_COLORS.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@/src/lib/money';
import { JarRing } from './JarRing';
import type { Jar } from './types';

type Props = {
  readonly jar: Jar;
  readonly balanceCents: number;
};

export function JarRow({ jar, balanceCents }: Props): React.JSX.Element {
  const { t } = useTranslation();

  const balanceStr = formatMoney({ amountCents: balanceCents, currency: 'EUR' });
  const targetStr = formatMoney({ amountCents: jar.targetCents, currency: 'EUR' });
  const fraction = jar.targetCents > 0 ? balanceCents / jar.targetCents : 0;
  const pct = Math.round(Math.min(fraction, 1) * 100);
  const a11yLabel = `${jar.name}, ${balanceStr} ${t('jars.balance_label')} ${targetStr} ${t('jars.target_display_label')}`;

  return (
    <Pressable
      onPress={() => router.push(`/jars/${jar.id}`)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.ringWrap} pointerEvents="none">
        <JarRing
          balanceCents={balanceCents}
          targetCents={jar.targetCents}
          size={46}
          strokeWidth={5}
          palette={fraction >= 0.5 ? 'sage' : 'sageSoft'}
          showCenterLabel={false}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} allowFontScaling>
          {jar.name}
        </Text>
        <Text style={styles.meta} allowFontScaling>
          {balanceStr} / {targetStr}
        </Text>
      </View>

      <Text style={styles.pct} allowFontScaling>
        {pct}%
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    columnGap: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${COLORS.textMuted}33`,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.75,
  },
  ringWrap: {
    width: 46,
    height: 46,
  },
  info: {
    flex: 1,
    rowGap: 2,
  },
  name: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
  },
  meta: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
  },
  pct: {
    ...TYPE.uiBody,
    // HTML §6 uses --moss-text; sageDark is the text-safe sage variant
    // (4.91:1 on background per tokens.ts comment).
    color: COLORS.sageDark,
  },
});
