/**
 * Clothing — hanger and shirt. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M12.0 5.4 Q10.4 5.4 10.4 6.8 Q10.4 7.8 12.0 8.0 L12.0 9.0 M5.0 13.6 L12.0 9.0 L19.0 13.6 L18.0 14.6 L13.6 12.4 L13.6 18.4 L10.4 18.4 L10.4 12.4 L6.0 14.6 Z';

export function Clothing({ color, size = 24 }: Props): React.JSX.Element {
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

export default Clothing;
