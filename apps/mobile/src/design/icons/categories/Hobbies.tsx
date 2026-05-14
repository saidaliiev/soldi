/**
 * Hobbies — paintbrush. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M5.0 17.0 Q5.0 19.0 7.0 19.0 Q9.0 19.0 9.0 17.0 Q9.0 15.6 7.4 15.4 M8.4 15.6 L17.6 6.4 Q18.0 6.0 18.4 6.4 L19.4 7.4 Q19.8 7.8 19.4 8.2 L10.2 17.4';

export function Hobbies({ color, size = 24 }: Props): React.JSX.Element {
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

export default Hobbies;
