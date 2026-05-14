/**
 * IconPicker — horizontal scroll of the 30 hand-drawn category icons (D-20).
 *
 * UI-SPEC §IconPicker:
 *   - 44×44pt tap cells (min target), 28×28pt inner icon
 *   - SPACING.sm gap between cells, SPACING.md edge padding
 *   - Selected: COLORS.accent @ 15% bg, 1pt COLORS.accent border
 *   - Renders icon in currently selected category color (passed via prop)
 *   - accessibilityRole="button", accessibilityLabel="[slug] icon"
 */

import React from 'react';
import { ScrollView, Pressable, View, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { ICON_REGISTRY, ICON_SLUGS, type IconSlug } from '@design/icons/categories/_iconRegistry';

const SELECTED_BG = `${COLORS.accent}26`; // 15% alpha 8-bit hex

type Props = {
  readonly selectedSlug: IconSlug;
  readonly iconColor: string;
  readonly onSelect: (slug: IconSlug) => void;
};

export function IconPicker({ selectedSlug, iconColor, onSelect }: Props): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {ICON_SLUGS.map((slug) => {
        const Icon = ICON_REGISTRY[slug];
        const isSelected = slug === selectedSlug;
        return (
          <Pressable
            key={slug}
            onPress={() => onSelect(slug)}
            accessibilityRole="button"
            accessibilityLabel={`${slug} icon`}
            accessibilityState={{ selected: isSelected }}
            style={({ pressed }) => [
              styles.cell,
              isSelected && styles.cellSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.iconWrap}>
              <Icon color={iconColor} size={28} />
            </View>
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
  iconWrap: {
    width: 28,
    height: 28,
  },
  pressed: {
    opacity: 0.7,
  },
});
