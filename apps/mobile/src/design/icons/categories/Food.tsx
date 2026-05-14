/**
 * Food — bowl with steam wisps. Hand-drawn aesthetic: control points shifted
 * by ~0.5pt off the geometric grid for organic line feel (D-21).
 * 24×24 viewBox, Skia Path renderer.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
// Bowl arc + rim line + two steam wisps (slightly imperfect for hand-drawn feel)
const PATH_D =
  'M4.2 13.5 Q4.0 18.2 12.0 18.4 Q20.1 18.3 19.8 13.5 L4.2 13.5 Z ' +
  'M3.6 13.4 L20.4 13.5 ' +
  'M9.0 6.0 Q10.2 7.6 9.2 9.4 ' +
  'M14.0 5.6 Q15.4 7.4 14.2 9.2';

export function Food({ color, size = 24 }: Props): React.JSX.Element {
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

export default Food;
