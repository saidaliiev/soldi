/**
 * ChatBubbleAssistantTyping — placeholder bubble while ai-query is in flight.
 *
 * UI-SPEC §ChatBubbleAssistantTyping:
 * - Left-aligned, COLORS.surface bg, 1pt textMuted@20% border, RADIUS.lg + 4pt tail-side
 * - 3 dots 6pt diameter COLORS.textMuted, 4pt gaps
 * - Animation: staggered breath infinite — opacity 0.3→1→0.3, 400ms each, 150ms stagger
 * - Timeout: if request > 6s → replaced with error bubble (caller's responsibility)
 * - Accessibility: role=text, label="Assistant is thinking", liveRegion=polite
 *
 * Reduced motion: static "…" character instead of pulsing dots (via useReducedMotion).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  useReducedMotion,
} from 'react-native-reanimated';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';

const BORDER_COLOR = `${COLORS.textMuted}33`; // textMuted @ 20%
const DOT_SIZE = 6;
const DOT_GAP = 4;

function AnimatedDot({ staggerMs }: { staggerMs: number }): React.JSX.Element {
  const opacity = useSharedValue(0.3);

  // Wave 4 ACCEPTED governance drift (logged, not bulldozed): this is an
  // INFINITE breath loop, a distinct motion archetype — not an enter. The
  // MOTION vocabulary + useMotion boundary express one-shot value
  // transitions, not loop-composable {duration,easing} for withRepeat/
  // withSequence. Governing it cleanly needs a loop-aware boundary primitive,
  // which is out of scope for an editorial wave (tracked alongside the
  // deferred shared-primitive-motion debt). Reduce-motion already bypasses
  // this entirely (static "…" via useReducedMotion) so the literals never
  // run for reduce-motion users.
  React.useEffect(() => {
    opacity.value = withDelay(
      staggerMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1, // infinite
        false,
      ),
    );
  }, [opacity, staggerMs]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.dot, animStyle]} />;
}

export function ChatBubbleAssistantTyping(): React.JSX.Element {
  const reduceMotion = useReducedMotion();

  return (
    <View
      style={styles.wrapper}
      accessibilityRole="text"
      accessibilityLabel="Assistant is thinking"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.bubble}>
        {reduceMotion ? (
          <Text style={styles.staticDots} allowFontScaling={false}>
            …
          </Text>
        ) : (
          <View style={styles.dotsRow}>
            <AnimatedDot staggerMs={0} />
            <AnimatedDot staggerMs={150} />
            <AnimatedDot staggerMs={300} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bubble: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    height: 36,
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: COLORS.textMuted,
  },
  staticDots: {
    ...TYPE.uiBody,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
});
