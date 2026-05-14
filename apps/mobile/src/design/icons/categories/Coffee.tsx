/**
 * Coffee — cup with handle and steam. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M5.4 11.0 L17.0 11.0 L16.4 17.0 Q16.2 18.2 15.0 18.2 L7.4 18.2 Q6.2 18.2 6.0 17.0 L5.4 11.0 Z M17.0 12.4 Q19.4 12.6 19.4 14.6 Q19.4 16.4 17.0 16.6 M8.8 5.8 Q10.0 7.4 9.0 8.8 M12.4 5.8 Q13.6 7.4 12.6 8.8';

export function Coffee({ color, size = 24 }: Props): React.JSX.Element {
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

export default Coffee;
