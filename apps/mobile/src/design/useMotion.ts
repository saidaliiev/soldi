/**
 * SOLDI motion boundary (redesign Wave 2). The ONLY file that maps the pure
 * src/design/motion.ts vocabulary onto react-native-reanimated. Components
 * consume withMotion(toValue, presetName) — never ad-hoc withTiming/Easing
 * literals (CLAUDE.md §Design: "Motion: only via src/design/motion.ts
 * vocabulary"). Mirrors the Wave-1 architecture: pure decision (motion.ts:
 * selectMotionPreset) + one thin RN boundary (this file).
 *
 * reduce-motion is mandatory (spec §2.1 / R3): when enabled, withMotion
 * returns the target value directly (no animation node) so the consumer
 * snaps instantly — count-up shows the final number, donut renders final
 * arcs, FAB/sharedMonth carry without movement.
 */

import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, withTiming, type EasingFunction } from 'react-native-reanimated';

import { selectMotionPreset } from './motion';
import type { EasingToken, MotionName } from './motion';

/**
 * Resolve a pure EasingToken to a reanimated Easing fn. Wave 2 uses only
 * timing tokens. `'spring'` is driven by withSpring (not Easing) and only
 * lands with MOTION.sheetSpring in Wave 4 — fail fast so a misuse is loud.
 */
function resolveEasing(token: EasingToken): EasingFunction {
  switch (token) {
    case 'outCubic':
      return Easing.out(Easing.cubic);
    case 'inOutCubic':
      return Easing.inOut(Easing.cubic);
    case 'linear':
      return Easing.linear;
    case 'spring':
      throw new Error(
        "useMotion: 'spring' is driven by withSpring, not Easing — MOTION.sheetSpring lands in Wave 4, not Wave 2",
      );
    default: {
      const _exhaustive: never = token;
      throw new Error(`useMotion: unknown easing token ${String(_exhaustive)}`);
    }
  }
}

/**
 * Subscribe to the OS reduce-motion setting. Mirrors GlassTabBar's
 * reduce-transparency pattern (initial read + change listener, cleanup).
 *
 * Initial state is `false` until the async `isReduceMotionEnabled()`
 * resolves (AccessibilityInfo has no synchronous read). For on-mount
 * animations this is a sub-frame window; the fallback is a brief animation
 * start before the snap — accepted tradeoff vs complicating every consumer
 * with a not-yet-known state.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setReduceMotion(v),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduceMotion;
}

export type WithMotion = (toValue: number, name: MotionName) => number;

/**
 * Vocabulary-bound animation factory. Assign its result to a SharedValue:
 *   sv.value = withMotion(1, 'arcDraw');
 * Full motion → withTiming(toValue, {duration,easing}) from the named preset.
 * Reduce-motion → returns toValue (instant snap, no animation node).
 */
export function useMotion(): { withMotion: WithMotion; reduceMotion: boolean } {
  const reduceMotion = useReduceMotion();
  const withMotion = useCallback<WithMotion>((toValue, name) => {
    const preset = selectMotionPreset(name, reduceMotion);
    if ('reduced' in preset && preset.reduced) return toValue;
    return withTiming(toValue, {
      duration: preset.durationMs,
      easing: resolveEasing(preset.easing),
    });
  }, [reduceMotion]);
  return { withMotion, reduceMotion };
}
