/**
 * SOLDI jar ring geometry — Phase 4 plan 04-02.
 *
 * Pure module: no React, no Skia, no side effects.
 * Produces SVG path strings consumable by Skia's `Skia.Path.MakeFromSVGString`.
 * node:test compatible.
 *
 * Conventions (matching donutArcs.ts + chatChartGeometry.ts):
 * - Start angle: -π/2 = 12 o'clock (top), sweeps clockwise.
 * - Center at (radius, radius) — canvas is sized (radius*2) × (radius*2).
 * - Fraction clamped to [0, 1] — over-funded jars show a full ring (D-04).
 *
 * D-04: fraction > 1 is clamped to 1 (over-funded → full ring, label shown by UI).
 */

// ---------------------------------------------------------------------------
// jarRingArcPath
// ---------------------------------------------------------------------------

/**
 * Returns an SVG arc path string for a single progress arc.
 *
 * @param fraction     Progress fraction (balanceCents / targetCents). Clamped to [0, 1].
 * @param radius       Arc centerline radius in points (canvas width = radius * 2).
 * @param strokeWidth  Stroke width in points (used for center calculation).
 * @returns            SVG path string (M/A commands) for Skia.Path.MakeFromSVGString.
 *
 * @remarks
 * Degenerate case: fraction = 0 returns an empty string — the caller should
 * render only the background track when no progress has been made.
 */
export function jarRingArcPath(
  fraction: number,
  radius: number,
  strokeWidth: number,
): string {
  // D-04: clamp over-funded fraction to 1 (full ring)
  const clamped = Math.min(1, Math.max(0, fraction));

  // Degenerate: no progress — documented zero-sweep return
  if (clamped === 0) return '';

  const cx = radius;
  const cy = radius;

  // Full-ring: use 359.9° instead of 360° to avoid SVG degenerate arc
  // (start === end point collapses to a point in SVG/Skia).
  const sweepDeg = clamped >= 1 ? 359.9 : clamped * 360;

  // Start at -90° (12 o'clock, matching donutArcs/chatChartGeometry convention)
  const startAngleRad = -Math.PI / 2;
  const endAngleRad = startAngleRad + (sweepDeg * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startAngleRad);
  const y1 = cy + radius * Math.sin(startAngleRad);
  const x2 = cx + radius * Math.cos(endAngleRad);
  const y2 = cy + radius * Math.sin(endAngleRad);

  const largeArcFlag = sweepDeg > 180 ? 1 : 0;
  // Clockwise direction matches SVG sweep-flag = 1
  const sweepFlag = 1;

  // Suppress unused parameter warning — strokeWidth is accepted for API consistency
  // with the caller (JarRing.tsx computes cx/cy from it for the canvas size).
  void strokeWidth;

  return `M ${fmt(x1)},${fmt(y1)} A ${fmt(radius)},${fmt(radius)} 0 ${largeArcFlag} ${sweepFlag} ${fmt(x2)},${fmt(y2)}`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : '0';
}
