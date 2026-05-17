/**
 * SOLDI motion vocabulary — single source of motion truth (spec §2.1).
 *
 * Pure: NO react-native-reanimated import (node-test importable, like
 * contrast.ts). Later-wave components map these presets onto Reanimated
 * worklets; they MUST NOT invent ad-hoc durations/easings (CLAUDE.md rule).
 *
 * `easing` is a NAMED token resolved to a Reanimated Easing fn at the call
 * site (Wave 1 helper). reduce-motion: call degradeForReducedMotion() when
 * AccessibilityInfo.isReduceMotionEnabled() is true.
 */

export type EasingToken = 'outCubic' | 'inOutCubic' | 'spring' | 'linear';

export type MotionPreset = {
  readonly durationMs: number;
  readonly easing: EasingToken;
};

export type ReducedMotionPreset = {
  readonly durationMs: 0;
  readonly easing: 'linear';
  readonly reduced: true;
};

export const MOTION = {
  /** Hero total counts 0 → value on mount (MonthlyTotalHero). */
  heroCountUp: { durationMs: 600, easing: 'outCubic' },
  /** Donut arcs draw in on first mount (DonutChart). */
  arcDraw: { durationMs: 700, easing: 'outCubic' },
  /** Donut arcs morph between months (closes deferred D-05). */
  arcInterpolate: { durationMs: 450, easing: 'inOutCubic' },
  /** Scroll-driven FAB hide/reveal (ChatLaunchFAB). */
  fabReveal: { durationMs: 220, easing: 'outCubic' },
  /** Shared-element carry on month-swipe (hero number + donut). */
  sharedMonth: { durationMs: 380, easing: 'inOutCubic' },
  /** Bottom-sheet open/close spring (chat / recategorize). */
  sheetSpring: { durationMs: 420, easing: 'spring' },
} as const satisfies Record<string, MotionPreset>;

export type MotionName = keyof typeof MOTION;

/**
 * Collapse a preset to an instant, linear, opacity-only form for users with
 * reduce-motion enabled. Pure — returns a new object, never mutates input.
 */
export function degradeForReducedMotion(_preset: MotionPreset): ReducedMotionPreset {
  return { durationMs: 0, easing: 'linear', reduced: true };
}
