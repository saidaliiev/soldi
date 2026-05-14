/**
 * Electronics — laptop outline. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M4.6 7.6 L19.4 7.6 Q19.6 7.6 19.6 7.8 L19.6 15.0 Q19.6 15.2 19.4 15.2 L4.6 15.2 Q4.4 15.2 4.4 15.0 L4.4 7.8 Q4.4 7.6 4.6 7.6 Z M3.2 16.4 L20.8 16.4 L20.6 17.2 Q20.4 17.6 20.0 17.6 L4.0 17.6 Q3.6 17.6 3.4 17.2 L3.2 16.4 Z';

export function Electronics({ color, size = 24 }: Props): React.JSX.Element {
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

export default Electronics;
