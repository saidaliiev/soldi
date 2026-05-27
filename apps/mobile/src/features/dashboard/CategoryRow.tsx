/**
 * CategoryRow — single top-5 row below the donut (UI-SPEC §CategoryRow).
 *
 * Layout:
 *   [color dot] [icon] [name ........... amount]
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
import { useCategoryEditorStore } from '@/src/features/categories/store';
import type { CategorySlice } from './types';

type Props = {
  readonly slice: CategorySlice;
  readonly locale?: string;
  readonly currency?: string;
};

export function CategoryRow({
  slice,
  locale = 'en-IE',
  currency = 'EUR',
}: Props): React.JSX.Element {
  const formatted = formatMoney({ amountCents: slice.amountCents, currency }, locale);
  const displayName = localizedCategoryName(slice, locale);
  const percentInt = Math.round(slice.percentage * 100);

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
        {/* 2026-05-26 emoji-category refactor: glyph replaces the prior
            BaseCategoryIcon SVG. Slice.emoji is hydrated by dashboardRepo. */}
        <Text style={styles.emoji} allowFontScaling={false}>
          {slice.emoji}
        </Text>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail" allowFontScaling>
          {displayName}
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.amount} allowFontScaling>
          {formatted}
        </Text>
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
  emoji: {
    // Matches the previous 20pt BaseCategoryIcon footprint; line-height
    // generous so the glyph isn't clipped on Android.
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
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
});
