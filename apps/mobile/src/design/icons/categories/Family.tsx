/**
 * Family — two figures. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M8.4 8.6 Q8.4 10.6 9.6 10.6 Q10.8 10.6 10.8 8.6 Q10.8 6.8 9.6 6.8 Q8.4 6.8 8.4 8.6 Z M6.4 18.4 L6.4 14.0 Q6.4 11.6 9.6 11.6 Q12.8 11.6 12.8 14.0 L12.8 18.4 M14.0 8.6 Q14.0 10.6 15.0 10.6 Q16.0 10.6 16.0 8.6 Q16.0 7.0 15.0 7.0 Q14.0 7.0 14.0 8.6 Z M13.0 18.4 L13.0 14.6 Q13.0 12.4 15.4 12.4 Q17.8 12.4 17.8 14.6 L17.8 18.4';

export function Family({ color, size = 24 }: Props): React.JSX.Element {
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

export default Family;
