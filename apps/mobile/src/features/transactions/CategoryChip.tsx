/**
 * CategoryChip — pill rendering a category's emoji + name.
 *
 * UI-SPEC §CategoryChip: swatch @ 20% bg, 60% border, full-opacity label.
 * Used by TransactionRow + the recategorize sheet's recent strip + the
 * filter modal's category multi-select rows.
 *
 * 2026-05-26 emoji-category refactor: the SVG icon resolver is gone — the
 * chip now renders the category's emoji string directly. The `color` prop
 * still drives the pill tint (backdrop + border alpha).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { DEFAULT_CATEGORY_EMOJI, emojiForSlug } from '@data/categoryEmojis';

type Props = {
  readonly slug: string | null;
  readonly name: string;
  readonly color: string | null;
  /**
   * Explicit emoji from the row record. When omitted the chip falls back to
   * the slug → emoji map, then to the `misc` 📌 pin. Callers that already
   * have a category record should pass `emoji` to avoid the map lookup.
   */
  readonly emoji?: string | null;
  readonly size?: 'sm' | 'md';
};

const SUFFIX_BG = '33'; // 20% alpha 8-bit hex
const SUFFIX_BORDER = '99'; // 60% alpha 8-bit hex

export function CategoryChip({
  slug,
  name,
  color,
  emoji,
  size = 'sm',
}: Props): React.JSX.Element {
  const swatch = color ?? COLORS.textMuted;
  const styles = size === 'sm' ? smallStyles : mediumStyles;
  const resolvedEmoji =
    emoji != null && emoji.length > 0
      ? emoji
      : slug != null
        ? emojiForSlug(slug)
        : DEFAULT_CATEGORY_EMOJI;

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: `${swatch}${SUFFIX_BG}`,
          borderColor: `${swatch}${SUFFIX_BORDER}`,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Category ${name}`}
    >
      <Text style={styles.emoji} allowFontScaling={false}>
        {resolvedEmoji}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const smallStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    height: 24,
    columnGap: 6,
    alignSelf: 'flex-start',
  },
  emoji: {
    fontSize: 14,
    lineHeight: 16,
  },
  label: {
    ...TYPE.uiMeta,
    color: COLORS.textPrimary,
    fontSize: 12,
  },
});

const mediumStyles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    height: 32,
    columnGap: SPACING.sm,
    alignSelf: 'flex-start',
  },
  emoji: {
    fontSize: 18,
    lineHeight: 20,
  },
  label: {
    ...TYPE.uiLabel,
    color: COLORS.textPrimary,
  },
});
