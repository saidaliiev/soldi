/**
 * Savings — piggy bank outline. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M4.6 12.0 Q4.4 8.4 8.4 7.6 Q11.0 7.0 13.6 8.0 L17.4 7.0 L17.0 9.8 Q19.4 10.8 19.4 13.4 Q19.4 15.6 17.6 16.6 L17.4 18.4 L15.4 18.4 L15.0 17.4 Q13.2 17.6 11.6 17.4 L10.8 18.4 L8.8 18.4 L8.6 16.6 Q5.0 15.4 4.6 12.0 Z M16.6 12.2 L16.8 12.2 M5.0 12.0 L7.0 11.8';

export function Savings({ color, size = 24 }: Props): React.JSX.Element {
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

export default Savings;
