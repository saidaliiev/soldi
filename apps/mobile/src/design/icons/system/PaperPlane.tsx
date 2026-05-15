/**
 * PaperPlane — send button icon, 18pt internal (24pt canvas).
 * Simple paper-plane path; single fill color.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = {
  readonly size?: number;
  readonly color?: string;
};

// Paper plane pointing top-right: origin at bottom-left (3,21), tip at top-right (21,3)
const PLANE_PATH_D =
  'M22 2 L11 13 ' +       // main diagonal spine
  'M22 2 L15 22 L11 13 L2 9 Z'; // body envelope

export function PaperPlane({ size = 24, color = '#000000' }: Props): React.JSX.Element {
  const planePath = React.useMemo(() => Skia.Path.MakeFromSVGString(PLANE_PATH_D), []);
  const scale = size / 24;

  return (
    <Canvas style={{ width: size, height: size }}>
      {planePath && (
        <Path
          path={planePath}
          color={color}
          style="stroke"
          strokeWidth={1.8 / scale}
          strokeCap="round"
          strokeJoin="round"
          transform={[{ scale }]}
        />
      )}
    </Canvas>
  );
}
