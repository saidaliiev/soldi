/**
 * Salary — wallet. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M3.6 8.0 L18.4 8.0 Q18.6 8.0 18.6 8.2 L18.6 16.6 Q18.6 16.8 18.4 16.8 L3.6 16.8 Q3.4 16.8 3.4 16.6 L3.4 8.2 Q3.4 8.0 3.6 8.0 Z M18.6 10.6 L20.6 10.6 L20.6 14.2 L18.6 14.2 M15.6 12.4 Q15.6 13.0 16.2 13.0 Q16.8 13.0 16.8 12.4 Q16.8 11.8 16.2 11.8 Q15.6 11.8 15.6 12.4 Z';

export function Salary({ color, size = 24 }: Props): React.JSX.Element {
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

export default Salary;
