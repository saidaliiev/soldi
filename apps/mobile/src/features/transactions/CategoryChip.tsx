/**
 * CategoryChip — 20pt pill rendering a category's icon + name.
 *
 * UI-SPEC §CategoryChip: swatch @ 20% bg, 60% border, full-opacity label.
 * Used by TransactionRow + the recategorize sheet's recent strip + the
 * filter modal's category multi-select rows.
 *
 * Icon resolution: canonical resolveIcon (ICON_REGISTRY → SLUG_ALIASES →
 * Misc). Must use the shared helper so seed slugs with no dedicated
 * component (eating-out, kids, …) map to their alias icon instead of Misc.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { COLORS, RADIUS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { resolveIcon } from '@design/icons/categories';

type Props = {
  readonly slug: string | null;
  readonly name: string;
  readonly color: string | null;
  readonly size?: 'sm' | 'md';
};

const SUFFIX_BG = '33'; // 20% alpha 8-bit hex
const SUFFIX_BORDER = '99'; // 60% alpha 8-bit hex

export function CategoryChip({
  slug,
  name,
  color,
  size = 'sm',
}: Props): React.JSX.Element {
  const Icon = resolveIcon(slug);
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
