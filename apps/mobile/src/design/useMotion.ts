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
import { Easing, Keyframe, withTiming, type EasingFunction } from 'react-native-reanimated';

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

/** The only enter geometry value: rows rise this many pt into place. */
const ROW_ENTER_TRANSLATE_Y = 8;
/**
 * First-paint budget. The row-enter is a one-shot "list settles in" delight,
 * NOT a per-scroll effect. FlashList v2 recycles row views, so a naive
 * `entering` would re-fire on every recycle during scroll (jank + wrong
 * motion). The gate opens on the FIRST useRowEnter() call (the list's first
 * paint) and closes after this window, so rows realized later by scroll /
 * recycle get no animation.
 */
const ROW_ENTER_WINDOW_MS = 600;
// Deviation from Wave-3 plan Task 2 (documented): the plan said anchor the
// window to module-load time. That is defective — if the Transactions screen
// opens >600ms after app start (the normal case: boot lands on the dashboard),
// the window is already closed and the enter never fires. Anchoring to the
// first useRowEnter() invocation fires on the real list first-paint whenever
// the screen opens, and is still recycle-safe (scroll happens after the
// window). Net: correct feature instead of a silent no-op.
let listFirstPaintAt: number | null = null;

/**
 * Recycle-safe list-row enter for the transaction list (Wave 3). Returns a
 * reanimated `Keyframe` (fade + ROW_ENTER_TRANSLATE_Y rise, timing/easing from
 * the governed MOTION.listRowEnter preset) ONLY for rows painted in the first
 * ROW_ENTER_WINDOW_MS of the list's first appearance. Returns `undefined`
 * (no entering) for reduce-motion and for any row realized after that window
 * (scroll / FlashList recycle). Consume as: <Animated.View entering={rowEnter}>.
 */
export function useRowEnter(): InstanceType<typeof Keyframe> | undefined {
  const reduceMotion = useReduceMotion();
  const preset = selectMotionPreset('listRowEnter', reduceMotion);
  if (listFirstPaintAt === null) listFirstPaintAt = Date.now();
  const withinFirstPaint = Date.now() - listFirstPaintAt < ROW_ENTER_WINDOW_MS;
  if (('reduced' in preset && preset.reduced) || preset.durationMs <= 0 || !withinFirstPaint) {
    return undefined;
  }
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: ROW_ENTER_TRANSLATE_Y }] },
    100: {
      opacity: 1,
      transform: [{ translateY: 0 }],
      easing: resolveEasing(preset.easing),
    },
  }).duration(preset.durationMs);
}
