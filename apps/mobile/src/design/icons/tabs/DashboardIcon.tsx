/**
 * Dashboard tab icon — hand-drawn-feel 2×2 rectangle grid.
 *
 * Rendered via Skia Canvas + Path (project stack — no react-native-svg dep).
 * 24×24 viewBox; strokeWidth 1.6, round caps + joins. Slight coordinate
 * irregularity (D-21 hand-drawn aesthetic) — not geometric perfection.
 *
 * Props:
 *   color: stroke color (typically COLORS.accent active / COLORS.textMuted inactive)
 *   size:  rendered square size in points (default 24).
 *
 * Banned: no inline hex, no emoji, no lucide. Color comes via prop.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = {
  readonly color: string;
  readonly size?: number;
};

const STROKE = 1.6;

// Two slightly imperfect rounded rectangles forming a 2×2 grid in the
// 24×24 viewBox. Coordinates intentionally have ±0.2 jitter for the
// hand-drawn feel called out in D-21.
const PATH_D =
  // top-left tile
  'M3.2 3.4 L10.6 3.2 Q11.0 3.2 11.0 3.6 L11.0 10.8 Q11.0 11.2 10.6 11.2 L3.4 11.2 Q3.0 11.2 3.0 10.8 Z ' +
  // top-right tile
  'M13.4 3.2 L20.6 3.4 Q21.0 3.4 21.0 3.8 L21.0 10.8 Q21.0 11.2 20.6 11.2 L13.4 11.2 Q13.0 11.2 13.0 10.8 Z ' +
  // bottom-left tile
  'M3.2 13.4 L10.6 13.2 Q11.0 13.2 11.0 13.6 L11.0 20.8 Q11.0 21.2 10.6 21.2 L3.4 21.2 Q3.0 21.2 3.0 20.8 Z ' +
  // bottom-right tile
  'M13.4 13.2 L20.6 13.4 Q21.0 13.4 21.0 13.8 L21.0 20.8 Q21.0 21.2 20.6 21.2 L13.4 21.2 Q13.0 21.2 13.0 20.8 Z';

export function DashboardIcon({ color, size = 24 }: Props): React.JSX.Element {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(PATH_D), []);
  const scale = size / 24;
  if (path == null) {
    // Defensive: Skia rejected the SVG — render an empty canvas (never crash).
    return <Canvas style={{ width: size, height: size }} />;
  }
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={color}
        style="stroke"
        strokeWidth={STROKE * scale}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  );
}
