/**
 * Groceries — shopping basket. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M4.0 9.4 L20.0 9.4 L18.2 17.8 Q18.0 18.2 17.6 18.2 L6.4 18.2 Q6.0 18.2 5.8 17.8 L4.0 9.4 Z M7.4 9.4 L10.0 5.8 M16.6 9.4 L14.0 5.8 M9.2 12.0 L9.6 15.4 M14.8 12.0 L14.4 15.4';

export function Groceries({ color, size = 24 }: Props): React.JSX.Element {
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

export default Groceries;
