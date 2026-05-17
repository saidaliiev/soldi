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
