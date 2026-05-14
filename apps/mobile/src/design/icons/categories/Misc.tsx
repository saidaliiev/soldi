/**
 * Misc — three-dot ellipsis. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M5.4 12.0 Q5.4 13.2 6.4 13.2 Q7.6 13.2 7.6 12.0 Q7.6 10.8 6.4 10.8 Q5.4 10.8 5.4 12.0 Z M10.8 12.0 Q10.8 13.2 12.0 13.2 Q13.2 13.2 13.2 12.0 Q13.2 10.8 12.0 10.8 Q10.8 10.8 10.8 12.0 Z M16.4 12.0 Q16.4 13.2 17.6 13.2 Q18.6 13.2 18.6 12.0 Q18.6 10.8 17.6 10.8 Q16.4 10.8 16.4 12.0 Z';

export function Misc({ color, size = 24 }: Props): React.JSX.Element {
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

export default Misc;
