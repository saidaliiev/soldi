/**
 * Subscriptions — refresh circle. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M19.0 12.0 Q19.0 16.8 14.6 18.0 Q10.0 19.2 7.0 16.0 M5.0 12.0 Q5.0 7.2 9.4 6.0 Q14.0 4.8 17.0 8.0 M17.4 5.2 L17.0 8.4 L13.8 8.0 M6.6 18.8 L7.0 15.6 L10.2 16.0';

export function Subscriptions({ color, size = 24 }: Props): React.JSX.Element {
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

export default Subscriptions;
