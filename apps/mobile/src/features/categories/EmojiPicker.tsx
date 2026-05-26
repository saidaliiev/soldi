/**
 * EmojiPicker — horizontal scroll of the 30 curated category emojis
 * (2026-05-26 emoji refactor — replaces the prior SVG IconPicker).
 *
 * UI-SPEC §IconPicker (revised):
 *   - 44×44pt tap cells (min target), 28pt emoji glyph centered
 *   - SPACING.sm gap between cells, SPACING.md edge padding
 *   - Selected: COLORS.accent @ 15% bg, 1pt COLORS.accent border
 *   - accessibilityRole="button", accessibilityLabel="[emoji] category icon"
 *
 * Source of truth: CATEGORY_EMOJIS in src/data/categoryEmojis.ts. Adding a
 * new picker entry means adding to the canonical map there, not editing this
 * file directly.
 */

import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { CATEGORY_EMOJIS } from '@data/categoryEmojis';

const SELECTED_BG = `${COLORS.accent}26`; // 15% alpha 8-bit hex

type Props = {
  readonly selectedEmoji: string;
  readonly onSelect: (emoji: string) => void;
};

export function EmojiPicker({ selectedEmoji, onSelect }: Props): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CATEGORY_EMOJIS.map((emoji) => {
        const isSelected = emoji === selectedEmoji;
        return (
          <Pressable
            key={emoji}
            onPress={() => onSelect(emoji)}
            accessibilityRole="button"
            accessibilityLabel={`${emoji} category icon`}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.cell,
              isSelected && styles.cellSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.emoji} allowFontScaling={false}>
              {emoji}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    columnGap: SPACING.sm,
  },
  cell: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellSelected: {
    backgroundColor: SELECTED_BG,
    borderColor: COLORS.accent,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
