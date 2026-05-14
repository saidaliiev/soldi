/**
 * Fuel — fuel pump. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M5.6 7.2 Q5.4 6.4 6.4 6.4 L12.6 6.4 Q13.4 6.4 13.4 7.2 L13.4 18.0 L5.4 18.0 L5.6 7.2 Z M5.6 10.6 L13.4 10.6 M13.4 9.2 L15.8 9.2 L15.8 13.8 Q15.8 14.4 16.4 14.4 Q17.0 14.4 17.2 13.8 L17.2 8.0 M16.0 6.0 L18.2 8.2';

export function Fuel({ color, size = 24 }: Props): React.JSX.Element {
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

export default Fuel;
