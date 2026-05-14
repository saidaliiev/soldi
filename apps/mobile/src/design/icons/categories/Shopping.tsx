/**
 * Shopping — shopping bag. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M5.6 8.6 L18.4 8.6 L17.6 18.0 Q17.4 18.4 17.0 18.4 L7.0 18.4 Q6.6 18.4 6.4 18.0 L5.6 8.6 Z M9.0 8.6 Q9.0 5.4 12.0 5.4 Q15.0 5.4 15.0 8.6';

export function Shopping({ color, size = 24 }: Props): React.JSX.Element {
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

export default Shopping;
