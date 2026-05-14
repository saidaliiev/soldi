/**
 * ChevronLeft — minimal navigation arrow for MonthSwiper bounds + tx detail nav.
 *
 * Rendered via Skia Canvas + Path. 24×24 viewBox; strokeWidth 1.6, round
 * caps + joins.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = {
  readonly color: string;
  readonly size?: number;
};

const STROKE = 1.6;
const PATH_D = 'M15.0 5.0 L8.4 12.0 L15.0 19.0';

export function ChevronLeft({ color, size = 24 }: Props): React.JSX.Element {
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
