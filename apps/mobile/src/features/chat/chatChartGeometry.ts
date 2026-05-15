/**
 * chatChartGeometry.ts — pure geometry functions for ChatMiniChart.
 *
 * All functions are pure (no side effects, no imports from RN/Skia).
 * Extracted from the component for testability (node:test + tsx).
 *
 * Coordinate system: (0,0) = top-left of the canvas.
 */

// ---------------------------------------------------------------------------
// sparklinePath — SVG path d-string for a line sparkline
// ---------------------------------------------------------------------------

/**
 * Builds an SVG path d-string that traces the data as a polyline.
 *
 * @param values  Array of numeric values (min 2).
 * @param w       Canvas width in points.
 * @param h       Canvas height in points.
 * @param vPad    Vertical padding so the stroke doesn't clip (default 4).
 * @returns       SVG path d-string: 'M x0,y0 L x1,y1 ...'
 */
export function sparklinePath(values: readonly number[], w: number, h: number, vPad = 4): string {
  if (values.length < 2 || w <= 0 || h <= 0) return '';

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const innerH = h - vPad * 2;

  const normalize = (v: number): number =>
    range === 0 ? h / 2 : vPad + (1 - (v - min) / range) * innerH;

  const stepX = w / (values.length - 1);

  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = normalize(v);
      return i === 0 ? `M ${x.toFixed(1)},${y.toFixed(1)}` : `L ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// donutArcs — arc geometry for the donut chart
// ---------------------------------------------------------------------------

export type DonutArc = {
  d: string;     // SVG arc path for a Skia Path
  color: string; // resolved hex color (from token resolver in the component)
  label: string;
  value: number;
};

/**
 * Computes donut arc path strings for a set of slices.
 *
 * Each arc is a Skia-compatible SVG arc path (A command). The donut is drawn
 * with 2pt gaps between slices.
 *
 * @param slices       Array of { label, value, color } (color = token name).
 * @param radius       Arc centerline radius (default 40).
 * @param strokeWidth  Stroke width (default 8).
 * @returns            Array of { d, color, label, value } ordered as input.
 */
export function donutArcs(
  slices: readonly { label: string; value: number; color: string }[],
  radius = 40,
  strokeWidth = 8,
): DonutArc[] {
  if (slices.length === 0) return [];

  const total = slices.reduce((s, sl) => s + Math.abs(sl.value), 0);
  if (total === 0) return [];

  const cx = radius + strokeWidth / 2;
  const cy = radius + strokeWidth / 2;
  const GAP_DEG = 2;
  const gapRad = (GAP_DEG * Math.PI) / 180;
  const totalGap = gapRad * slices.length;
  const usable = 2 * Math.PI - totalGap;

  let currentAngle = -Math.PI / 2; // start at 12 o'clock

  return slices.map((sl) => {
    const proportion = Math.abs(sl.value) / total;
    const arcAngle = proportion * usable;
    const startAngle = currentAngle;
    const endAngle = startAngle + arcAngle;
    currentAngle = endAngle + gapRad;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = arcAngle > Math.PI ? 1 : 0;

    const d = `M ${x1.toFixed(2)},${y1.toFixed(2)} A ${radius},${radius} 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)}`;

    return {
      d,
      color: sl.color,
      label: sl.label,
      value: sl.value,
    };
  });
}

// ---------------------------------------------------------------------------
// barLayout — bar chart geometry
// ---------------------------------------------------------------------------

export type BarRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  value: number;
};

/**
 * Computes bar rectangles for a vertical bar chart.
 *
 * @param bars   Array of { label, value }.
 * @param w      Canvas width.
 * @param h      Canvas height.
 * @param vPad   Bottom padding for labels (default 20).
 * @param hGap   Gap between bars as fraction of bar width (default 0.2).
 * @returns      Array of { x, y, w, h, label, value }.
 */
export function barLayout(
  bars: readonly { label: string; value: number }[],
  w: number,
  h: number,
  vPad = 20,
  hGap = 0.2,
): BarRect[] {
  if (bars.length === 0 || w <= 0 || h <= 0) return [];

  const maxVal = Math.max(...bars.map((b) => Math.abs(b.value)));
  if (maxVal === 0) return [];

  const innerH = h - vPad;
  const barW = (w / bars.length) * (1 - hGap);
  const gapW = (w / bars.length) * hGap;

  return bars.map((bar, i) => {
    const barH = (Math.abs(bar.value) / maxVal) * innerH;
    const x = i * (barW + gapW) + gapW / 2;
    const y = innerH - barH;
    return { x, y, w: barW, h: barH, label: bar.label, value: bar.value };
  });
}
