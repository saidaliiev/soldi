/**
 * Beauty — lipstick. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M9.4 5.0 L14.6 5.0 L13.6 9.4 L10.4 9.4 L9.4 5.0 Z M8.6 10.0 L15.4 10.0 Q15.6 10.0 15.6 10.2 L15.6 13.4 Q15.6 13.6 15.4 13.6 L8.6 13.6 Q8.4 13.6 8.4 13.4 L8.4 10.2 Q8.4 10.0 8.6 10.0 Z M9.2 13.6 L14.8 13.6 L14.8 18.2 L9.2 18.2 L9.2 13.6 Z';

export function Beauty({ color, size = 24 }: Props): React.JSX.Element {
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

export default Beauty;
