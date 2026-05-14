/**
 * Fitness — dumbbell. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M3.6 12.0 L5.6 12.0 M5.6 9.0 L5.6 15.0 M5.6 12.0 L7.6 12.0 L7.6 9.6 L9.4 9.6 L9.4 14.4 L7.6 14.4 L7.6 12.0 M14.6 12.0 L16.4 12.0 L16.4 9.6 L18.4 9.6 L18.4 14.4 L16.4 14.4 L16.4 12.0 M9.4 12.0 L14.6 12.0 M18.4 9.0 L18.4 15.0 M18.4 12.0 L20.4 12.0';

export function Fitness({ color, size = 24 }: Props): React.JSX.Element {
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

export default Fitness;
