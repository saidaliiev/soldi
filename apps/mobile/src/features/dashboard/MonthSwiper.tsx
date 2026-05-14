/**
 * MonthSwiper — horizontal pan navigator between months (D-02 + UI-SPEC §MonthSwiper).
 *
 * Layout:
 *   [ ← ] [   Month YYYY   ] [ → ]
 *
 * Behavior:
 *   - Pan-left → next month (clamped to latestPlusOne).
 *   - Pan-right → previous month (clamped to earliest).
 *   - Chevron buttons mirror the gesture and are hidden at bounds.
 *   - withTiming snap, 250ms Easing.out(Easing.quad) (UI-SPEC animation contract).
 *   - accessibilityRole='adjustable' + accessibilityActions for VoiceOver.
 *
 * Worklet: the pan tracks translateX as a shared value (UI-thread). On release,
 * the JS side picks the next month and the SV resets to 0 with withTiming.
 *
 * Performance: gesture runs on the UI thread; month-state mutation goes through
 * runOnJS only once per release (D-26).
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { ChevronLeft } from '@/src/design/icons/chevrons/ChevronLeft';
import { ChevronRight } from '@/src/design/icons/chevrons/ChevronRight';
import {
  addMonths,
  clampMonth,
  compareMonth,
  formatMonthLabel,
} from './monthMath';
import type { MonthKey } from './types';

type Props = {
  readonly selected: MonthKey;
  readonly onChange: (next: MonthKey) => void;
  readonly earliest: MonthKey;
  readonly latestPlusOne: MonthKey;
  readonly locale?: string;
};

// Pan distance (pt) that triggers a month change.
const SWIPE_THRESHOLD = 60;

export function MonthSwiper({
  selected,
  onChange,
  earliest,
  latestPlusOne,
  locale = 'en-IE',
}: Props): React.JSX.Element {
  const translateX = useSharedValue(0);

  const monthLabel = formatMonthLabel(selected, locale);

  const isAtPastLock = useMemo(
    () => compareMonth(selected, earliest) <= 0,
    [selected, earliest]
  );
  const isAtFutureLock = useMemo(
    () => compareMonth(selected, latestPlusOne) >= 0,
    [selected, latestPlusOne]
  );

  const applyDelta = useCallback(
    (delta: number) => {
      // delta: +1 = next month, −1 = previous month
      const next = clampMonth(addMonths(selected, delta), earliest, latestPlusOne);
      if (compareMonth(next, selected) !== 0) onChange(next);
    },
    [selected, earliest, latestPlusOne, onChange]
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .onUpdate((e) => {
          'worklet';
          translateX.value = e.translationX;
        })
        .onEnd((e) => {
          'worklet';
          // Negative translationX = finger moved left → user wants next month.
          if (e.translationX <= -SWIPE_THRESHOLD) {
            runOnJS(applyDelta)(1);
          } else if (e.translationX >= SWIPE_THRESHOLD) {
            runOnJS(applyDelta)(-1);
          }
          translateX.value = withTiming(0, {
            duration: 250,
            easing: Easing.out(Easing.quad),
          });
        }),
    [applyDelta, translateX]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={styles.container}
      accessibilityRole="adjustable"
      accessibilityLabel={`${monthLabel}, swipe to navigate`}
      accessibilityActions={[
        { name: 'increment', label: 'Next month' },
        { name: 'decrement', label: 'Previous month' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') applyDelta(1);
        else if (event.nativeEvent.actionName === 'decrement') applyDelta(-1);
      }}
    >
      <Pressable
        onPress={() => applyDelta(-1)}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        hitSlop={12}
        style={[styles.chev, isAtPastLock && styles.chevHidden]}
        disabled={isAtPastLock}
      >
        <ChevronLeft color={COLORS.textSecondary} size={20} />
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.labelWrapper, animatedStyle]}>
          <Text style={styles.label} allowFontScaling>
            {monthLabel}
          </Text>
        </Animated.View>
      </GestureDetector>

      <Pressable
        onPress={() => applyDelta(1)}
        accessibilityRole="button"
        accessibilityLabel="Next month"
        hitSlop={12}
        style={[styles.chev, isAtFutureLock && styles.chevHidden]}
        disabled={isAtFutureLock}
      >
        <ChevronRight color={COLORS.textSecondary} size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  chev: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevHidden: {
    opacity: 0,
  },
  labelWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
  },
});
