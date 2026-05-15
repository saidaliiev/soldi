/**
 * ChevronRefresh — refresh-arrow icon for the ChatErrorBanner.
 * Circular arrow with a chevron arrowhead.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = {
  readonly size?: number;
  readonly color?: string;
};

// Circular refresh arc (270deg) with arrowhead at the end
const REFRESH_PATH_D =
  'M20 12 C20 7.6 16.4 4 12 4 C7.6 4 4 7.6 4 12 C4 16.4 7.6 20 12 20 ' +
  'M20 4 L20 9 L15 9'; // arrowhead notch

export function ChevronRefresh({ size = 24, color = '#000000' }: Props): React.JSX.Element {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(REFRESH_PATH_D), []);
  const scale = size / 24;

  return (
    <Canvas style={{ width: size, height: size }}>
      {path && (
        <Path
          path={path}
          color={color}
          style="stroke"
          strokeWidth={1.6 / scale}
          strokeCap="round"
          strokeJoin="round"
          transform={[{ scale }]}
        />
      )}
    </Canvas>
  );
}
