/**
 * SOLDI dashboard donut — pure arc math.
 *
 * Produces SVG path strings consumable by Skia's `Skia.Path.MakeFromSVGString`.
 * Pure: no React, no Skia, no DOM — node:test compatible.
 *
 * Conventions:
 * - Angles in degrees. 0° = 12 o'clock (top), increases clockwise (SVG convention).
 * - Slice gap is split symmetrically: each slice loses gapDeg/2 from its start
 *   and end edges so adjacent slices have a gapDeg total separation.
 * - Slices come in caller order (caller pre-sorts descending per D-06).
 * - "Other" slice (if present) is appended last.
 * - Empty input → empty output, never NaN.
 *
 * UI-SPEC §DonutChart:
 *   stroke width = 10pt
 *   gap between slices = 2pt
 *   Top 5 explicit slices; remainder aggregated to "Other".
 */

import type { CategorySlice } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DonutArc = {
  /** SVG path string (M / A commands). Consumable by Skia.Path.MakeFromSVGString. */
  readonly path: string;
  /** Slice fill color (caller-supplied, from D-22 swatch palette). */
  readonly color: string;
  /** Category id, or the literal 'other' for the aggregated remainder slice. */
  readonly categoryId: number | 'other';
};

export type SliceAngle = {
  readonly startDeg: number;
  readonly endDeg: number;
  readonly color: string;
  readonly categoryId: number | 'other';
};

// ---------------------------------------------------------------------------
// computeSliceAngles
// ---------------------------------------------------------------------------

/**
 * Computes per-slice angular extents in degrees (0° = 12 o'clock, clockwise).
 *
 * Each slice's angle proportion is `percentage * 360`. A gap of `gapDeg`
 * degrees is reserved between adjacent slices by trimming gapDeg/2 from
 * the leading and trailing edges of each slice.
 *
 * Total swept angle (sum of end−start across all slices) = 360 − N×gapDeg,
 * where N = number of arcs rendered (top + other).
 */
export function computeSliceAngles(
  slices: readonly CategorySlice[],
  other: CategorySlice | null,
  gapDeg: number
): readonly SliceAngle[] {
  const all: CategorySlice[] = [...slices];
  if (other != null) all.push(other);

  if (all.length === 0) return [];

  const half = gapDeg / 2;
  const result: SliceAngle[] = [];

  let cursorDeg = 0;
  for (const s of all) {
    const sweepFull = s.percentage * 360;
    const startDeg = cursorDeg + half;
    const endDeg = cursorDeg + sweepFull - half;
    result.push({
      startDeg,
      endDeg,
      color: s.color,
      categoryId: s.slug === 'other' ? 'other' : s.categoryId,
    });
    cursorDeg += sweepFull;
  }

  return result;
}

// ---------------------------------------------------------------------------
// buildDonutArcs
// ---------------------------------------------------------------------------

/**
 * Returns one SVG arc path per slice (and one for "Other" if supplied).
 *
 * Skia consumes the path strings via `Skia.Path.MakeFromSVGString(path)`.
 * The path is rendered as a stroke (no fill); the donut hole is the
 * absence of fill, not a punched shape.
 *
 * @param slices       Top-N category slices, descending by amount.
 * @param other        Aggregated remainder slice, or null.
 * @param radius       Stroke centerline radius in points (e.g. 90 for a
 *                     200pt-wide chart with 10pt stroke and 0pt outer margin).
 * @param _strokeWidth Reserved for future use (e.g. visual gap tuning).
 *                     Currently the gap is purely angular via gapDeg.
 * @param gapDeg       Angular gap between adjacent slices in degrees.
 */
export function buildDonutArcs(
  slices: readonly CategorySlice[],
  other: CategorySlice | null,
  radius: number,
  _strokeWidth: number,
  gapDeg: number
): readonly DonutArc[] {
  const angles = computeSliceAngles(slices, other, gapDeg);
  if (angles.length === 0) return [];

  // Canvas-local center; the caller positions the SVG path on the canvas.
  const cx = radius;
  const cy = radius;

  const arcs: DonutArc[] = [];
  for (const a of angles) {
    arcs.push({
      path: arcPath(cx, cy, radius, a.startDeg, a.endDeg),
      color: a.color,
      categoryId: a.categoryId,
    });
  }

  return arcs;
}

// ---------------------------------------------------------------------------
// arcPath — internal SVG arc helper
// ---------------------------------------------------------------------------

/**
 * Returns an SVG path for the arc on the circle of radius `r` centered at
 * (cx, cy), from `startDeg` to `endDeg` (degrees, 0° = top, clockwise).
 *
 * Single-slice 100%-ish cases (sweep > 180°) flip the large-arc-flag to 1.
 */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const startPt = polarToCartesian(cx, cy, r, startDeg);
  const endPt = polarToCartesian(cx, cy, r, endDeg);

  const sweepDeg = endDeg - startDeg;
  const largeArcFlag = sweepDeg > 180 ? 1 : 0;
  // 0° = top, increasing clockwise → SVG sweep-flag = 1 (clockwise direction).
  const sweepFlag = 1;

  return [
    'M',
    fmt(startPt.x),
    fmt(startPt.y),
    'A',
    fmt(r),
    fmt(r),
    '0',
    String(largeArcFlag),
    String(sweepFlag),
    fmt(endPt.x),
    fmt(endPt.y),
  ].join(' ');
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  // 0° = top (12 o'clock), increases clockwise.
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function fmt(n: number): string {
  // 4 decimal places — Skia consumes float SVG cleanly; trim trailing zeros.
  return Number.isFinite(n) ? n.toFixed(4).replace(/\.?0+$/, '') : '0';
}
