/**
 * CategoryListRow — single row on the CategoriesScreen list.
 *
 * UI-SPEC §CategoriesScreen:
 *   - 52pt row height (>= 44pt tap target + padding)
 *   - icon (24pt) + 8pt color dot + name (TYPE.uiBody) + chevron right (12pt)
 *   - Tap → opens CategoryEditorBottomSheet in edit mode
 *   - Long-press → enters drag mode (medium haptic + lift)
 *
 * Drag-to-merge (D-19): long-press publishes draggingId to DragMergeContext;
 * actual drag visual is handled here via reanimated shared values (scale + shadow).
 * Drop target detection is keyed off pointer position vs row layout — kept
 * simple in v1: tapping a target row while another is being dragged
 * commits the merge via onDrop().
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { localizedCategoryName } from '@data/categoriesRepo';
import { TYPE } from '@design/typography';
import { resolveIcon } from '@design/icons/categories';
import { ChevronRight } from '@design/icons/chevrons/ChevronRight';
import type { Category } from './types';
import { useDragMerge } from './DragMergeContext';

const DROP_TARGET_BG = `${COLORS.accentSoft}33`; // 20% alpha hex

type Props = {
  readonly category: Category;
  readonly onPress: (id: number) => void;
};

export function CategoryListRow({ category, onPress }: Props): React.JSX.Element {
  const { i18n } = useTranslation();
  const displayName = localizedCategoryName(category, i18n.language);
  // Resolve by canonical slug, not icon_name: the seed stored Lucide ids
  // ("shopping-cart") in icon_name which never match ICON_REGISTRY (keyed by
  // slug). category.slug is migration-002 backfilled / name-derived.
  const Icon = resolveIcon(category.slug);
  const { draggingId, dropTargetId, setDraggingId, setDropTargetId, onDrop } = useDragMerge();
  const scale = useSharedValue(1);

  const isDragging = draggingId === category.id;
  const isDropTarget = dropTargetId === category.id && draggingId !== null && draggingId !== category.id;

  React.useEffect(() => {
    scale.value = withSpring(isDragging ? 1.04 : 1, { damping: 15 });
  }, [isDragging, scale]);

  const handleLongPress = () => {
    if (!category.isCustom) return; // Defaults aren't merge-source candidates
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    setDraggingId(category.id);
  };

  const handlePress = () => {
    if (draggingId !== null && draggingId !== category.id) {
      // Currently dragging another row; tap finalizes the merge target
      onDrop(draggingId, category.id);
      return;
    }
    onPress(category.id);
  };

  const handleHoverIn = () => {
    if (draggingId !== null && draggingId !== category.id) {
      setDropTargetId(category.id);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, isDragging && styles.dragging]}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handleHoverIn}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, tap to edit`}
        style={({ pressed }) => [
          styles.row,
          isDropTarget && styles.dropTarget,
          pressed && styles.pressed,
        ]}
      >
        {/* W5 §5: icon-badge (40pt palette swatch behind icon) replaces
            the prior dot + separate icon-well. Background = category color
            at 12% alpha (matches HTML §5 .ico card tint), icon stroke =
            category color at full alpha. */}
        <View style={[styles.iconBadge, { backgroundColor: `${category.color}1F` }]}>
          <Icon color={category.color} size={22} />
        </View>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail" allowFontScaling>
          {displayName}
        </Text>
        <ChevronRight color={COLORS.textMuted} size={16} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    columnGap: SPACING.md,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
    flex: 1,
  },
  dragging: {
    ...SHADOWS.card,
  },
  dropTarget: {
    backgroundColor: DROP_TARGET_BG,
  },
  pressed: {
    opacity: 0.85,
  },
});
