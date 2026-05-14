/**
 * CategoryChip — 20pt pill rendering a category's icon + name.
 *
 * UI-SPEC §CategoryChip: swatch @ 20% bg, 60% border, full-opacity label.
 * Used by TransactionRow + the recategorize sheet's recent strip + the
 * filter modal's category multi-select rows.
 *
 * Icon resolution: ICON_REGISTRY (from 02-04). Falls back to Misc when the
 * category's icon_slug is unknown.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { ICON_REGISTRY } from '@design/icons/categories/_iconRegistry';
import { Misc } from '@design/icons/categories/Misc';

type Props = {
  readonly slug: string | null;
  readonly name: string;
  readonly color: string | null;
  readonly size?: 'sm' | 'md';
};

const SUFFIX_BG = '33'; // 20% alpha 8-bit hex
const SUFFIX_BORDER = '99'; // 60% alpha 8-bit hex

function resolveIconComponent(slug: string | null) {
  if (slug != null && slug in ICON_REGISTRY) {
    return ICON_REGISTRY[slug as keyof typeof ICON_REGISTRY];
  }
  return Misc;
}

export function CategoryChip({
  slug,
  name,
  color,
  size = 'sm',
}: Props): React.JSX.Element {
  const Icon = resolveIconComponent(slug);
  const swatch = color ?? COLORS.textMuted;
  const iconSize = size === 'sm' ? 14 : 18;
  const styles = size === 'sm' ? smallStyles : mediumStyles;

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
      <Icon color={swatch} size={iconSize} />
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
  label: {
    ...TYPE.uiLabel,
    color: COLORS.textPrimary,
  },
});
