/**
 * Gear icon — hand-drawn-feel cog for the Settings entry point.
 *
 * Rendered via Skia Canvas + Path (project stack — no react-native-svg dep).
 * 24×24 viewBox; strokeWidth 1.6, round caps + joins. Slight coordinate
 * irregularity for the hand-drawn aesthetic (D-21). Six-tooth gear.
 *
 * Props:
 *   color: stroke color (typically COLORS.textSecondary / COLORS.accent)
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

// Six-tooth cog in a 24×24 viewBox.
// Inner circle r≈4.8, outer radius r≈8.2 with 6 rectangular teeth.
// Slight ±0.2 jitter on teeth endpoints for the hand-drawn feel (D-21).
const PATH_D =
  // Outer hexagonal gear body (approximated with arc segments + teeth)
  'M12 2.8 C12.7 2.8 13.4 2.9 14.0 3.1 L14.8 4.9 C15.4 5.1 16.0 5.4 16.5 5.8 L18.4 5.3 C18.9 5.7 19.4 6.2 19.8 6.7 L19.2 8.6 C19.6 9.1 19.9 9.7 20.1 10.3 L21.9 11.1 C22.0 11.7 22.0 12.3 21.9 12.9 L20.1 13.7 C19.9 14.3 19.6 14.9 19.2 15.4 L19.8 17.3 C19.4 17.8 18.9 18.3 18.4 18.7 L16.5 18.2 C16.0 18.6 15.4 18.9 14.8 19.1 L14.0 20.9 C13.4 21.1 12.7 21.2 12.0 21.2 C11.3 21.2 10.6 21.1 10.0 20.9 L9.2 19.1 C8.6 18.9 8.0 18.6 7.5 18.2 L5.6 18.7 C5.1 18.3 4.6 17.8 4.2 17.3 L4.8 15.4 C4.4 14.9 4.1 14.3 3.9 13.7 L2.1 12.9 C2.0 12.3 2.0 11.7 2.1 11.1 L3.9 10.3 C4.1 9.7 4.4 9.1 4.8 8.6 L4.2 6.7 C4.6 6.2 5.1 5.7 5.6 5.3 L7.5 5.8 C8.0 5.4 8.6 5.1 9.2 4.9 L10.0 3.1 C10.6 2.9 11.3 2.8 12 2.8 Z ' +
  // Inner circle cutout (counter-clockwise so Skia renders it as hole)
  'M12 8.8 C10.2 8.8 8.8 10.2 8.8 12.0 C8.8 13.8 10.2 15.2 12.0 15.2 C13.8 15.2 15.2 13.8 15.2 12.0 C15.2 10.2 13.8 8.8 12.0 8.8 Z';

export function GearIcon({ color, size = 24 }: Props): React.JSX.Element {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(PATH_D), []);
  const scale = size / 24;
  if (path == null) {
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
