/**
 * Health — heart with cross. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M12.0 18.2 Q4.2 13.6 4.6 9.2 Q5.0 5.6 8.4 5.8 Q10.6 5.8 12.0 8.0 Q13.4 5.8 15.6 5.8 Q19.0 5.6 19.4 9.2 Q19.8 13.6 12.0 18.2 Z M12.0 10.0 L12.0 13.2 M10.4 11.6 L13.6 11.6';

export function Health({ color, size = 24 }: Props): React.JSX.Element {
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

export default Health;
