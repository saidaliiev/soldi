/**
 * Pets — paw print. Hand-drawn aesthetic (D-21): control points slightly
 * off-grid for organic line feel. 24×24 viewBox, rendered via Skia Path.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = { readonly color: string; readonly size?: number };

const STROKE = 1.6;
const PATH_D =
  'M7.0 9.0 Q7.0 10.6 8.2 10.6 Q9.4 10.6 9.4 9.0 Q9.4 7.4 8.2 7.4 Q7.0 7.4 7.0 9.0 Z M14.6 9.0 Q14.6 10.6 15.8 10.6 Q17.0 10.6 17.0 9.0 Q17.0 7.4 15.8 7.4 Q14.6 7.4 14.6 9.0 Z M4.4 12.6 Q4.4 14.0 5.4 14.0 Q6.4 14.0 6.4 12.6 Q6.4 11.4 5.4 11.4 Q4.4 11.4 4.4 12.6 Z M17.6 12.6 Q17.6 14.0 18.6 14.0 Q19.6 14.0 19.6 12.6 Q19.6 11.4 18.6 11.4 Q17.6 11.4 17.6 12.6 Z M8.6 16.0 Q8.6 13.4 12.0 13.4 Q15.4 13.4 15.4 16.0 Q15.4 18.6 12.0 18.6 Q8.6 18.6 8.6 16.0 Z';

export function Pets({ color, size = 24 }: Props): React.JSX.Element {
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

export default Pets;
