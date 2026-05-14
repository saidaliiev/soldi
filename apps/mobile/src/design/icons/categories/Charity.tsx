/**
 * Charity — open hand and heart. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M7.0 14.0 L7.0 18.4 L17.0 18.4 L17.0 14.0 Q17.0 12.6 15.6 12.6 L8.4 12.6 Q7.0 12.6 7.0 14.0 Z M12.0 12.6 L12.0 10.6 M12.0 10.6 Q9.8 8.8 9.8 7.0 Q9.8 5.4 11.0 5.4 Q12.0 5.4 12.0 6.6 Q12.0 5.4 13.0 5.4 Q14.2 5.4 14.2 7.0 Q14.2 8.8 12.0 10.6 Z';

export function Charity({ color, size = 24 }: Props): React.JSX.Element {
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

export default Charity;
