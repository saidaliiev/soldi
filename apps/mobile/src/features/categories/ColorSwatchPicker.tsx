/**
 * ColorSwatchPicker — 8 brand swatches (D-22) for category color choice.
 *
 * UI-SPEC §ColorSwatch:
 *   - 32×32pt circular swatch
 *   - 44×44pt outer Pressable hit area
 *   - Selected: 2pt outer ring COLORS.accent
 *   - accessibilityRole="radio", accessibilityState.checked
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';

import { COLORS, SPACING, RADIUS } from '@design/tokens';

/** 8 D-22 swatch tuple — order matches UI-SPEC §"Category color swatches". */
export const SWATCHES = [
  { color: COLORS.accent, label: 'Terracotta' },
  { color: COLORS.accentSoft, label: 'Soft terracotta' },
  { color: COLORS.accentDeep, label: 'Deep terracotta' },
  { color: COLORS.sage, label: 'Sage' },
  { color: COLORS.sageSoft, label: 'Soft sage' },
  { color: COLORS.sageDeep, label: 'Deep sage' },
  { color: COLORS.error, label: 'Warm red' },
  { color: COLORS.textSecondary, label: 'Brown' },
] as const;

export type SwatchColor = typeof SWATCHES[number]['color'];

type Props = {
  readonly selectedColor: string;
  readonly onSelect: (color: string) => void;
};

export function ColorSwatchPicker({ selectedColor, onSelect }: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      {SWATCHES.map(({ color, label }) => {
        const isSelected = color === selectedColor;
        return (
          <Pressable
            key={color}
            onPress={() => onSelect(color)}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: isSelected }}
            style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.ring,
                isSelected && styles.ringSelected,
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: color }]} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    columnGap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    flexWrap: 'wrap',
    rowGap: SPACING.sm,
  },
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringSelected: {
    borderColor: COLORS.accent,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
  },
  pressed: {
    opacity: 0.7,
  },
});
