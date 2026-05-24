/**
 * SourceTile — reusable data-source picker tile.
 *
 * Design rules:
 * - Reanimated v4 entrance: fade + translateY (16 → 0), staggered via delayMs.
 * - Pressed state via Pressable style callback (scale 0.98 + opacity 0.92).
 * - minHeight 88pt to exceed the 44pt tap target requirement.
 * - accessibilityRole 'button' + accessibilityLabel on every tile.
 * - Token-only styling; no inline hex anywhere.
 * - Left icon placeholder (32×32) — Phase 2 will wire real SVGs.
 */

import React, { useEffect } from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  type PressableStateCallbackType,
} from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { COLORS, RADIUS, SPACING, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { SOURCE_ICONS } from '@design/icons/onboarding';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type SourceTileProps = {
  /** Localized tile title (also used as fallback accessibilityLabel). */
  title: string;
  /** Localized one-line description below the title. */
  body: string;
  /**
   * String reference for the icon. Phase 2 will map this to SVG assets.
   * Rendered as a 32×32 placeholder View in Phase 1.
   */
  iconName: string;
  onPress: () => void;
  /** Override default accessibilityLabel (falls back to title). */
  accessibilityLabel?: string;
  testID?: string;
  /** Entrance animation delay in ms. Defaults to 0. */
  delayMs?: number;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SourceTile({
  title,
  body,
  iconName,
  onPress,
  accessibilityLabel,
  testID,
  delayMs = 0,
}: SourceTileProps): React.JSX.Element {
  const Icon = SOURCE_ICONS[iconName];
  // Entrance animation — opacity + translateY
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(delayMs, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delayMs, withTiming(0, { duration: 400 }));
  }, [delayMs, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        testID={testID}
        style={({ pressed }: PressableStateCallbackType) => [
          styles.pressable,
          pressed && styles.pressed,
        ]}
      >
        {/* Icon badge — 42x42 surface, Skia glyph centred at 21x21 */}
        <View
          style={styles.iconBadge}
          testID="source-tile-icon-badge"
          accessible={false}
        >
          {Icon ? <Icon size={21} color={COLORS.accent} /> : null}
        </View>

        {/* Text column */}
        <View style={styles.textColumn}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles — token-only, no inline hex
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  pressable: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(156, 91, 65, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  body: {
    ...TYPE.uiLabel,
    color: COLORS.textSecondary,
  },
});
