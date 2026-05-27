/**
 * ChatLaunchFAB — floating action button on the Dashboard tab.
 *
 * UI-SPEC §ChatLaunchFAB:
 * - 56×56pt, RADIUS.pill, GRADIENTS.primary gradient fill via Skia Canvas
 * - SparkQuill icon 24pt COLORS.white, centered
 * - SHADOWS.card — no glow
 * - Appears 200ms after mount via withDelay spring (scale 0→1)
 * - Press + reveal: MOTION.fabReveal (220ms outCubic) via the motion vocabulary
 * - Accessibility: role=button, label=ai.fab_label, hint=ai.fab_hint
 *
 * scrollY prop: when provided, FAB hides when scrollY ≤ 40 (hero area),
 * eased via MOTION.fabReveal. If no scrollY is provided → always visible
 * (non-animated fallback).
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
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { COLORS, RADIUS, SHADOWS, SPACING } from '@design/tokens';
import { useMotion } from '@design/useMotion';
import { SparkQuill } from '@design/icons/system/SparkQuill';
import {
  TAB_BAR_HEIGHT,
  TAB_BAR_FLOATING_MARGIN,
} from '@/src/features/chrome/GlassTabBar';
import { useChatStore } from './chatStore';

type Props = {
  /**
   * Reanimated SharedValue tracking dashboard scroll offset (Y).
   * When scrollY ≤ 40 the FAB fades out so it doesn't compete with the
   * hero monthly total on the first frame.
   * Optional — if absent FAB is always visible (non-animated fallback).
   */
  readonly scrollY?: SharedValue<number>;
};

// Exposed so screens hosting the FAB can extend ScrollView contentContainerStyle
// paddingBottom and reserve clearance under it — last list rows would otherwise
// be obscured by the absolutely-positioned overlay.
export const FAB_SIZE = 56;
const SCROLL_HIDE_THRESHOLD = 40;

export function ChatLaunchFAB({ scrollY }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const open = useChatStore((s) => s.open);
  const { withMotion } = useMotion();
  const insets = useSafeAreaInsets();

  // Clear the floating tab bar — its top edge sits at
  // `max(insets.bottom, TAB_BAR_FLOATING_MARGIN) + TAB_BAR_HEIGHT` from the
  // screen bottom. Place the FAB SPACING.md above that so it never gets
  // clipped behind the pill (verified Android emulator 2026-05-27).
  const fabBottom =
    Math.max(insets.bottom, TAB_BAR_FLOATING_MARGIN) +
    TAB_BAR_HEIGHT +
    SPACING.md;

  // Mount entrance: scale 0→1 delayed 200ms
  const mountScale = useSharedValue(0);
  const pressScale = useSharedValue(1);

  React.useEffect(() => {
    mountScale.value = withDelay(200, withSpring(1, { damping: 18, stiffness: 180 }));
  }, [mountScale]);

  // Scroll-driven reveal: hidden over the hero band, shown past the
  // threshold. Deliberate no-jank binary 0/1 driven on the UI thread by
  // scrollY (plan §Task7 rationale) — the eased "feel" is the press scale
  // via MOTION.fabReveal, not an opacity tween.
  const revealOpacity = useDerivedValue(() => {
    if (scrollY == null) return 1;
    return scrollY.value > SCROLL_HIDE_THRESHOLD ? 1 : 0;
  });

  const animStyle = useAnimatedStyle(() => {
    const combinedScale = mountScale.value * pressScale.value;
    return {
      transform: [{ scale: combinedScale }],
      opacity: scrollY == null ? 1 : revealOpacity.value,
    };
  });

  const handlePressIn = (): void => {
    pressScale.value = withMotion(0.94, 'fabReveal');
  };

  const handlePressOut = (): void => {
    pressScale.value = withMotion(1, 'fabReveal');
  };

  const handlePress = (): void => {
    open();
  };

  return (
    <Animated.View
      style={[styles.wrapper, { bottom: fabBottom }, animStyle]}
      pointerEvents="box-none"
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t('ai.fab_label')}
        accessibilityHint={t('ai.fab_hint')}
        style={styles.pressable}
      >
        {/* Gradient fill: accentSoft (#B97A5A) to accent (#9C5B41) via two-stop View */}
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
    // bottom is set dynamically from useSafeAreaInsets + TAB_BAR_HEIGHT in
    // the component so the FAB clears the floating tab bar across notch and
    // edge-to-edge devices.
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
    backgroundColor: COLORS.accentSoft, // midpoint of #B97A5A→#9C5B41
    alignItems: 'center',
    justifyContent: 'center',
  },
});
