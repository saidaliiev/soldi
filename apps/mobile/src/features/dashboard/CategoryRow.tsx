/**
 * CategoryRow — single top-5 row below the donut (UI-SPEC §CategoryRow).
 *
 * Layout:
 *   [color dot] [icon] [name ........... amount]
 *   [-------- 2pt percent bar (proportional width) --------]
 *
 * Tap → navigates to /transactions?categoryId={id} (consumed by 02-03).
 * Long-press → opens the global CategoryEditorBottomSheet for this category
 * (D-17, wired in 02-04 via useCategoryEditorStore).
 *
 * Money formatting: amountCents is already absolute positive; render with
 * formatMoney via a positive value (no minus sign on the donut breakdown).
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@lib/money';
import { localizedCategoryName } from '@data/categoriesRepo';
import { BaseCategoryIcon } from '@/src/design/icons/categories/BaseCategoryIcon';
import { useCategoryEditorStore } from '@/src/features/categories/store';
import type { CategorySlice } from './types';

type Props = {
  readonly slice: CategorySlice;
  readonly maxAmountCents: number; // denominator for the percent bar
  readonly locale?: string;
  readonly currency?: string;
};

export function CategoryRow({
  slice,
  maxAmountCents,
  locale = 'en-IE',
  currency = 'EUR',
}: Props): React.JSX.Element {
  const formatted = formatMoney({ amountCents: slice.amountCents, currency }, locale);
  const displayName = localizedCategoryName(slice, locale);
  const percentInt = Math.round(slice.percentage * 100);
  const barWidth = maxAmountCents > 0 ? slice.amountCents / maxAmountCents : 0;
  // 40% alpha appended via 8-bit hex suffix — same pattern as the tab-bar border.
  const barColor = `${slice.color}66`;

  const handlePress = () => {
    if (slice.slug === 'other') return; // "Other" is not a single category — no drill-down
    // TODO(02-03): consume the categoryId deep link in TransactionListScreen.
    router.push(`/(tabs)/transactions?categoryId=${String(slice.categoryId)}`);
  };

  const handleLongPress = () => {
    if (slice.slug === 'other') return; // aggregate slice — no edit target
    useCategoryEditorStore.getState().openForEdit(slice.categoryId);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${displayName}: ${formatted}, ${percentInt}%`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.topLine}>
        <View style={[styles.dot, { backgroundColor: slice.color }]} />
        <BaseCategoryIcon color={slice.color} size={20} />
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail" allowFontScaling>
          {displayName}
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.amount} allowFontScaling>
          {formatted}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              // Express bar as a percentage; clamped to [0, 1] for safety.
              width: `${Math.max(0, Math.min(1, barWidth)) * 100}%`,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    paddingVertical: SPACING.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.xs,
  },
  name: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
  },
  amount: {
    ...TYPE.tabular,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
    marginLeft: SPACING.sm,
  },
  barTrack: {
    height: 2,
    marginTop: SPACING.xs,
    backgroundColor: 'transparent',
  },
  barFill: {
    height: 2,
    borderRadius: 1,
  },
});
