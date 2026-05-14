/**
 * Restaurant — plate with fork and knife. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M6.0 5.6 L6.0 18.4 M5.0 5.6 L5.0 10.0 Q5.0 10.6 5.6 10.6 L6.4 10.6 Q7.0 10.6 7.0 10.0 L7.0 5.6 M17.0 5.6 Q15.4 5.6 15.4 8.4 Q15.4 10.6 17.0 11.0 L17.0 18.4 M17.0 11.0 L18.4 11.0';

export function Restaurant({ color, size = 24 }: Props): React.JSX.Element {
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

export default Restaurant;
