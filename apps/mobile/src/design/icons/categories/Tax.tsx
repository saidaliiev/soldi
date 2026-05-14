/**
 * Tax — percent in square. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M5.0 6.6 L19.0 6.6 Q19.2 6.6 19.2 6.8 L19.2 17.4 Q19.2 17.6 19.0 17.6 L5.0 17.6 Q4.8 17.6 4.8 17.4 L4.8 6.8 Q4.8 6.6 5.0 6.6 Z M9.0 9.4 Q9.0 10.6 9.8 10.6 Q10.8 10.6 10.8 9.4 Q10.8 8.4 9.8 8.4 Q9.0 8.4 9.0 9.4 Z M13.2 14.6 Q13.2 15.8 14.0 15.8 Q15.0 15.8 15.0 14.6 Q15.0 13.6 14.0 13.6 Q13.2 13.6 13.2 14.6 Z M8.0 16.0 L16.0 8.0';

export function Tax({ color, size = 24 }: Props): React.JSX.Element {
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

export default Tax;
