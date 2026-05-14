/**
 * Transport — stylized car silhouette. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M3.2 14.6 L3.4 11.8 Q3.6 10.0 5.6 9.8 L8.0 7.4 Q8.6 6.8 9.4 6.8 L15.0 6.8 Q15.8 6.8 16.4 7.4 L18.6 9.8 Q20.6 10.0 20.6 11.8 L20.6 14.6 L17.4 14.6 M3.4 14.6 L6.6 14.6 M9.4 14.6 L14.6 14.6 M6.6 16.4 Q6.6 17.6 7.6 17.6 Q8.8 17.6 8.6 16.4 M15.4 16.4 Q15.4 17.6 16.4 17.6 Q17.6 17.6 17.4 16.4';

export function Transport({ color, size = 24 }: Props): React.JSX.Element {
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

export default Transport;
