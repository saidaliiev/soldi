/**
 * JarRow — presentational list row for a single jar.
 *
 * Props: jar + balanceCents (pre-queried by JarListScreen).
 * Navigates to /jars/[id] on press via expo-router.
 *
 * 04-02: right side now shows a compact JarRing thumbnail (size=44) instead
 * of only the icon; the icon moves to the left well as before.
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
  const a11yLabel = `${jar.name}, ${balanceStr} ${t('jars.balance_label')} ${targetStr} ${t('jars.target_display_label')}`;

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
        <Text style={styles.meta} allowFontScaling>
          {balanceStr} / {targetStr}
        </Text>
      </View>

      {/* Compact ring thumbnail — reflects progress at a glance */}
      <View style={styles.ringWrap} pointerEvents="none">
        <JarRing balanceCents={balanceCents} targetCents={jar.targetCents} size={44} />
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
  meta: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
  },
  ringWrap: {
    marginLeft: SPACING.sm,
  },
});
