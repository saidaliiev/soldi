/**
 * SOLDI dashboard kinetic math (redesign Wave 2, spec §2.1).
 *
 * Pure: no React, no Skia, no reanimated — node:test compatible (mirrors
 * donutArcs.ts). The reanimated boundary (useMotion.ts) + components drive a
 * single progress value 0→1 and call these to get the per-frame geometry.
 *
 * D-05 close: arcs are interpolated in ANGLE space keyed by stable categoryId
 * (not SVG path strings — the usePathInterpolation topology blocker in
 * 02-01-SUMMARY is specific to path-string interpolation and does not apply).
 * prev=[] ⇒ every slice "enters" ⇒ the same code is the mount arc-draw.
 */

import type { SliceAngle } from './donutArcs';

/** Linear interpolate from→to by t; t clamped to [0,1]. Pure. */
export function interpolateScalar(from: number, to: number, t: number): number {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return from + (to - from) * c;
}

/**
 * Per-slice eased entrance progress for the mount arc-draw (Task 10 Step 1).
 *
 * Splits the global draw progress `globalT∈[0,1]` into one sub-window per
 * slice so the donut sweeps in sequentially (premium) rather than every arc
 * growing at once (mechanical). Pure — no reanimated/RN import; the cubic-out
 * shaping is inlined (mirrors useMotion's Easing.out(Easing.cubic)) so this
 * stays node-testable.
 *
 * Window model: slice `index∈[0,count)` owns `[start_i, start_i + span]`.
 *   - `overlap=1` ⇒ span = 1, every start_i = 0 ⇒ all windows = [0,1] ⇒ all
 *     slices identical = the previous simultaneous behavior (no regression).
 *   - `overlap=0` ⇒ windows fully sequential: [i/count, (i+1)/count] — slice
 *     i does not start until the one before it finishes.
 *   - between ⇒ linear blend of the two regimes (earlier slices always lead).
 *
 * Output is clamped to [0,1]; `globalT` out of range is clamped first. The
 * `count=1` (or `count<=0`) degenerate case returns the eased global progress.
 */
export function staggeredProgress(
  globalT: number,
  index: number,
  count: number,
  overlap: number,
): number {
  const g = globalT < 0 ? 0 : globalT > 1 ? 1 : globalT;
  if (count <= 1) return easeOutCubic(g);

  const o = overlap < 0 ? 0 : overlap > 1 ? 1 : overlap;
  // Sequential window size is 1/count; simultaneous is 1. Blend by overlap.
  const seqSpan = 1 / count;
  const span = seqSpan + (1 - seqSpan) * o; // overlap=0 → 1/count, overlap=1 → 1
  // Earlier indices start sooner. Sequential start = index/count; simultaneous
  // start = 0. Blend identically so the two regimes meet exactly at o∈{0,1}.
  const seqStart = index / count;
  const start = seqStart * (1 - o); // overlap=0 → index/count, overlap=1 → 0

  if (g <= start) return 0;
  const local = (g - start) / span; // span > 0 always (seqSpan>0, o∈[0,1])
  const clamped = local < 0 ? 0 : local > 1 ? 1 : local;
  return easeOutCubic(clamped);
}

/** Cubic ease-out, pure. Matches useMotion's Easing.out(Easing.cubic). */
function easeOutCubic(x: number): number {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  const inv = 1 - c;
  return 1 - inv * inv * inv;
}

/**
 * Quantize a mid-count animated cents value to an integer for display, while
 * guaranteeing the count-up lands EXACTLY on `target` (Task 10 Step 3 — no
 * off-by-one from a withTiming that settles at e.g. 12344.9997 or 12344.4999
 * whose nearest sampled frame never rounds to the true total). Pure.
 *
 * When `raw` is within `snapEpsilon` cents of `target` (animation effectively
 * complete) the exact integer `target` is returned; otherwise the nearest
 * integer to `raw`. `target` is assumed already integral (totalCents). Both
 * the early count frames and the final settle stay monotonic toward target.
 */
export function quantizeCents(raw: number, target: number, snapEpsilon = 0.5): number {
  return Math.abs(raw - target) <= snapEpsilon ? target : Math.round(raw);
}

// Collapsed exit slices narrower than this (deg) are dropped so t=1 === next.
const COLLAPSE_EPSILON = 1e-6;

/**
 * Interpolate the donut from `prev` slice angles to `next` by `t` (clamped
 * [0,1]). Result order/colors follow `next` for matched + entering slices;
 * exiting slices (in prev, absent from next) are appended, shrinking toward
 * their own start edge, and dropped once collapsed. At t=1 the result equals
 * `next` exactly (matched/entering settled, exits gone).
 *
 * - matched (same categoryId): startDeg/endDeg lerp prev→next, color = next.
 * - entering (only in next): startDeg = next.startDeg, endDeg grows from
 *   next.startDeg → next.endDeg (sweeps in from the leading edge).
 * - exiting (only in prev): startDeg fixed, endDeg shrinks prev.endDeg →
 *   prev.startDeg; removed when its sweep ≤ COLLAPSE_EPSILON.
 */
export function interpolateSliceAngles(
  prev: readonly SliceAngle[],
  next: readonly SliceAngle[],
  t: number,
): readonly SliceAngle[] {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  const prevById = new Map<number | 'other', SliceAngle>();
  for (const p of prev) prevById.set(p.categoryId, p);
  const nextIds = new Set<number | 'other'>(next.map((n) => n.categoryId));

  const out: SliceAngle[] = [];

  for (const n of next) {
    const p = prevById.get(n.categoryId);
    if (p) {
      // matched — morph geometry, snap to the new color (no color flicker).
      out.push({
        startDeg: interpolateScalar(p.startDeg, n.startDeg, c),
        endDeg: interpolateScalar(p.endDeg, n.endDeg, c),
        color: n.color,
        categoryId: n.categoryId,
      });
    } else {
      // entering — sweep in from the leading edge.
      out.push({
        startDeg: n.startDeg,
        endDeg: interpolateScalar(n.startDeg, n.endDeg, c),
        color: n.color,
        categoryId: n.categoryId,
      });
    }
  }

  for (const p of prev) {
    if (nextIds.has(p.categoryId)) continue;
    // exiting — shrink toward its own start edge.
    const endDeg = interpolateScalar(p.endDeg, p.startDeg, c);
    if (endDeg - p.startDeg <= COLLAPSE_EPSILON) continue; // collapsed → drop
    out.push({
      startDeg: p.startDeg,
      endDeg,
      color: p.color,
      categoryId: p.categoryId,
    });
  }

  return out;
}
