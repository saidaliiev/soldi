/**
 * JarRow — presentational list row for a single jar.
 *
 * Props: jar + balanceCents (pre-queried by JarListScreen).
 * Navigates to /jars/[id] on press via expo-router.
 *
 * A11y: accessibilityRole="button", accessibilityLabel summarises
 *   "{name}, {balance} of {target}". Min tap target 44pt height.
 * Tokens only — no hardcoded hex, no BANNED_COLORS.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@/src/lib/money';
import { JarIcon, type JarIconSlug } from '@design/icons/jars';
import type { Jar } from './types';

type Props = {
  readonly jar: Jar;
  readonly balanceCents: number;
};

export function JarRow({ jar, balanceCents }: Props): React.JSX.Element {
  const { t } = useTranslation();

  const balanceStr = formatMoney({ amountCents: balanceCents, currency: 'EUR' });
  const targetStr = formatMoney({ amountCents: jar.targetCents, currency: 'EUR' });
  const a11yLabel = `${jar.name}, ${balanceStr} ${t('jars.balance_label')} ${targetStr} ${t('jars.target_display_label')}`;

  const progress = jar.targetCents > 0 ? Math.min(balanceCents / jar.targetCents, 1) : 0;

  const iconSlug = jar.icon as JarIconSlug;

  return (
    <Pressable
      onPress={() => router.push(`/jars/${jar.id}`)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <JarIcon slug={iconSlug} color={COLORS.sage} size={28} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1} allowFontScaling>
          {jar.name}
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { flex: progress }]} />
          <View style={[styles.progressRemainder, { flex: 1 - progress }]} />
        </View>
        <Text style={styles.meta} allowFontScaling>
          {balanceStr} / {targetStr}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  pressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: `${COLORS.sage}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  info: {
    flex: 1,
    rowGap: 4,
  },
  name: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
  },
  progressBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: `${COLORS.sage}33`,
  },
  progressFill: {
    backgroundColor: COLORS.sage,
    borderRadius: 2,
  },
  progressRemainder: {
    backgroundColor: 'transparent',
  },
  meta: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
  },
});
