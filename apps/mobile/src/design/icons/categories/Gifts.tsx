/**
 * Gifts — ribboned box. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M4.0 10.4 L20.0 10.4 L20.0 18.0 Q20.0 18.2 19.8 18.2 L4.2 18.2 Q4.0 18.2 4.0 18.0 L4.0 10.4 Z M3.2 7.6 L20.8 7.6 L20.8 10.4 L3.2 10.4 Z M12.0 7.6 L12.0 18.2 M12.0 7.6 Q9.4 5.2 7.8 6.0 Q7.0 7.0 8.0 7.6 M12.0 7.6 Q14.6 5.2 16.2 6.0 Q17.0 7.0 16.0 7.6';

export function Gifts({ color, size = 24 }: Props): React.JSX.Element {
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

export default Gifts;
