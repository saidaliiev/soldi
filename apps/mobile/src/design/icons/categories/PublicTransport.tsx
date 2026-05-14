/**
 * PublicTransport — bus. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M4.4 7.4 Q4.4 6.6 5.2 6.6 L18.8 6.6 Q19.6 6.6 19.6 7.4 L19.6 16.4 Q19.6 17.2 18.8 17.2 L17.0 17.2 L17.0 18.4 L15.4 18.4 L15.4 17.2 L8.6 17.2 L8.6 18.4 L7.0 18.4 L7.0 17.2 L5.2 17.2 Q4.4 17.2 4.4 16.4 L4.4 7.4 Z M4.4 12.4 L19.6 12.4 M7.0 9.0 L11.0 9.0 M13.0 9.0 L17.0 9.0 M7.6 14.6 L7.8 14.6 M16.2 14.6 L16.4 14.6';

export function PublicTransport({ color, size = 24 }: Props): React.JSX.Element {
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

export default PublicTransport;
