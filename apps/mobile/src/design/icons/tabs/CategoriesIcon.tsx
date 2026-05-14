/**
 * Categories tab icon — tag/label outline with a single dot for the punch hole.
 *
 * Rendered via Skia Canvas + Path (project stack — no react-native-svg dep).
 * 24×24 viewBox; strokeWidth 1.6, round caps. D-21 hand-drawn aesthetic.
 *
 * Props:
 *   color: stroke color (active=accent / inactive=textMuted)
 *   size:  square size in pt, default 24.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = {
  readonly color: string;
  readonly size?: number;
};

const STROKE = 1.6;

// Tag outline (pentagonal — square body + pointed right) + a punch-hole dot.
// Slight irregularity per D-21.
const PATH_D =
  // Tag outline body
  'M3.6 5.4 L13.2 5.2 L20.6 11.8 Q21.1 12.2 20.6 12.7 L13.2 19.4 L3.6 19.0 Q3.0 19.0 3.0 18.4 L3.0 6.0 Q3.0 5.4 3.6 5.4 Z ' +
  // Punch-hole dot
  'M7.2 11.7 Q7.5 11.0 8.2 11.0 Q9.0 11.0 9.2 11.7 Q9.3 12.4 8.7 12.7 Q7.9 12.9 7.4 12.5 Q7.1 12.2 7.2 11.7 Z';

export function CategoriesIcon({ color, size = 24 }: Props): React.JSX.Element {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(PATH_D), []);
  const scale = size / 24;
  if (path == null) return <Canvas style={{ width: size, height: size }} />;
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
