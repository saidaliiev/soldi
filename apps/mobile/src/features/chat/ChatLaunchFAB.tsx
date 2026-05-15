/**
 * ChatLaunchFAB — floating action button on the Dashboard tab.
 *
 * UI-SPEC §ChatLaunchFAB:
 * - 56×56pt, RADIUS.pill, GRADIENTS.primary gradient fill via Skia Canvas
 * - SparkQuill icon 24pt COLORS.white, centered
 * - SHADOWS.card — no glow
 * - Appears 200ms after mount via withDelay spring (scale 0→1)
 * - Press: withTiming scale 1→0.94→1 (120ms)
 * - Accessibility: role=button, label=ai.fab_label, hint=ai.fab_hint
 *
 * scrollY prop: when provided, FAB hides when scrollY ≤ 40 (hero area).
 * If no scrollY is provided → always visible (non-animated fallback; flagged for Phase 5).
 *
 * Note: expo-linear-gradient is not in this project's deps. Gradient is
 * rendered via a flat GRADIENTS.primary[0] background + visual approximation.
 * Full Skia gradient (LinearGradient paint) can be wired in Phase 5.
 */

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS, RADIUS, SHADOWS, SPACING } from '@design/tokens';
import { SparkQuill } from '@design/icons/system/SparkQuill';
import { useChatStore } from './chatStore';

type Props = {
  /**
   * Reanimated SharedValue tracking dashboard scroll offset (Y).
   * When scrollY ≤ 40 the FAB fades out so it doesn't compete with the
   * hero monthly total on the first frame.
   * Optional — if absent FAB is always visible (flagged for Phase 5 wiring).
   */
  readonly scrollY?: SharedValue<number>;
};

const FAB_SIZE = 56;
const SCROLL_HIDE_THRESHOLD = 40;

export function ChatLaunchFAB({ scrollY }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const open = useChatStore((s) => s.open);

  // Mount entrance: scale 0→1 delayed 200ms
  const mountScale = useSharedValue(0);
  const pressScale = useSharedValue(1);

  React.useEffect(() => {
    mountScale.value = withDelay(200, withSpring(1, { damping: 18, stiffness: 180 }));
  }, [mountScale]);

  const animStyle = useAnimatedStyle(() => {
    const combinedScale = mountScale.value * pressScale.value;

    // Fade out when at top of scroll (scrollY ≤ SCROLL_HIDE_THRESHOLD)
    const opacity =
      scrollY != null
        ? scrollY.value > SCROLL_HIDE_THRESHOLD
          ? 1
          : 0
        : 1;

    return {
      transform: [{ scale: combinedScale }],
      opacity,
    };
  });

  const handlePressIn = (): void => {
    pressScale.value = withTiming(0.94, { duration: 60 });
  };

  const handlePressOut = (): void => {
    pressScale.value = withTiming(1, { duration: 60 });
  };

  const handlePress = (): void => {
    open();
  };

  return (
    <Animated.View style={[styles.wrapper, animStyle]} pointerEvents="box-none">
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t('ai:fab_label')}
        accessibilityHint={t('ai:fab_hint')}
        style={styles.pressable}
      >
        {/* Gradient fill: accentSoft (#D9997A) to accent (#C97B5C) via two-stop View */}
        <View style={styles.gradientBg}>
          <SparkQuill size={24} color={COLORS.white} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
  },
  pressable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  // GRADIENTS.primary approximated with the midpoint colour (accentSoft).
  // Phase 5 can wire a Skia LinearGradient paint for the true gradient.
  gradientBg: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentSoft, // midpoint of #D9997A→#C97B5C
    alignItems: 'center',
    justifyContent: 'center',
  },
});
