/**
 * Bills — envelope with currency mark. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M3.6 7.4 L20.4 7.4 Q20.6 7.4 20.6 7.6 L20.6 17.0 Q20.6 17.2 20.4 17.2 L3.6 17.2 Q3.4 17.2 3.4 17.0 L3.4 7.6 Q3.4 7.4 3.6 7.4 Z M3.6 7.6 L12.0 13.4 L20.4 7.6 M11.0 14.6 L11.0 16.2 M13.0 14.6 L13.0 16.2 M10.4 15.4 L13.6 15.4';

export function Bills({ color, size = 24 }: Props): React.JSX.Element {
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

export default Bills;
