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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Easing,
  Keyframe,
  withSpring,
  withTiming,
  type EasingFunction,
  type SharedValue,
} from 'react-native-reanimated';

import { selectMotionPreset, SHEET_DAMPING_RATIO } from './motion';
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
      // Wave 4: 'spring' is now supported, but it is driven by withSpring
      // (duration + dampingRatio), NOT an Easing fn. withMotion / useMotionSnap
      // route 'spring' presets to withSpring BEFORE calling resolveEasing, so
      // reaching this branch is a programming error (a new caller bypassing
      // the spring routing) — fail fast rather than silently mis-ease.
      throw new Error(
        "useMotion: resolveEasing must not be called for 'spring' — route via withSpring (withMotion/useMotionSnap handle this)",
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
    if (preset.easing === 'spring') {
      return withSpring(toValue, {
        duration: preset.durationMs,
        dampingRatio: SHEET_DAMPING_RATIO,
      });
    }
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

export type SnapTo = (sv: SharedValue<number>, toValue: number) => void;

/**
 * Worklet-safe vocabulary-bound snap (Wave 3). The JS `withMotion` above
 * cannot be called from inside a reanimated gesture worklet (it is a JS
 * useCallback). `useMotionSnap` returns a `'worklet'`-marked setter that
 * resolves the named preset on the JS side (pure selectMotionPreset, memoised
 * on name+reduce-motion) and closes the result into the worklet, so a gesture
 * `onEnd` can do `snap(sv, 0)` with zero ad-hoc duration/easing literals.
 * reduce-motion → instant set (no animation node). Sole sanctioned site for
 * governed motion inside gesture worklets (CLAUDE.md §Design vocabulary rule).
 */
export function useMotionSnap(name: MotionName): SnapTo {
  const reduceMotion = useReduceMotion();
  const cfg = useMemo(() => {
    const p = selectMotionPreset(name, reduceMotion);
    if ('reduced' in p && p.reduced) return { kind: 'instant' } as const;
    if (p.easing === 'spring') {
      return { kind: 'spring', durationMs: p.durationMs, dampingRatio: SHEET_DAMPING_RATIO } as const;
    }
    return { kind: 'timing', durationMs: p.durationMs, easing: resolveEasing(p.easing) } as const;
  }, [name, reduceMotion]);
  return useCallback<SnapTo>(
    (sv, toValue) => {
      'worklet';
      if (cfg.kind === 'instant') {
        sv.value = toValue;
        return;
      }
      if (cfg.kind === 'spring') {
        sv.value = withSpring(toValue, { duration: cfg.durationMs, dampingRatio: cfg.dampingRatio });
        return;
      }
      sv.value = withTiming(toValue, { duration: cfg.durationMs, easing: cfg.easing });
    },
    [cfg],
  );
}
