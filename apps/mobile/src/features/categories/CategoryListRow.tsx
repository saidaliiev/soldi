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

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
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
  const Icon = resolveIcon(category.iconName);
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
        accessibilityLabel={`${category.nameEn}, tap to edit`}
        style={({ pressed }) => [
          styles.row,
          isDropTarget && styles.dropTarget,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.colorDot, { backgroundColor: category.color }]} />
        <View style={styles.iconWrap}>
          <Icon color={category.color} size={24} />
        </View>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail" allowFontScaling>
          {category.nameEn}
        </Text>
        <ChevronRight color={COLORS.textMuted} size={16} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    columnGap: SPACING.sm,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.pill,
  },
  iconWrap: {
    width: 24,
    height: 24,
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
