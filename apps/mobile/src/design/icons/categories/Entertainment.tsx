/**
 * Entertainment — ticket stub with notch. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M4.2 8.2 L19.8 8.2 Q20.0 8.2 20.0 8.4 L20.0 11.0 Q18.6 11.4 18.6 12.0 Q18.6 12.6 20.0 13.0 L20.0 15.6 Q20.0 15.8 19.8 15.8 L4.2 15.8 Q4.0 15.8 4.0 15.6 L4.0 13.0 Q5.4 12.6 5.4 12.0 Q5.4 11.4 4.0 11.0 L4.0 8.4 Q4.0 8.2 4.2 8.2 Z M8.6 9.8 L8.6 10.6 M8.6 11.6 L8.6 12.4 M8.6 13.4 L8.6 14.2';

export function Entertainment({ color, size = 24 }: Props): React.JSX.Element {
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

export default Entertainment;
