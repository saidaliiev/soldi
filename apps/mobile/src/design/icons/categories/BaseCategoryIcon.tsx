/**
 * BaseCategoryIcon — fallback hand-drawn icon for category rows.
 *
 * Plan 02-04 ships the full 30-icon hand-drawn category set keyed by
 * icon_name. Until then, every CategoryRow renders this single base
 * icon (small filled circle inside a square outline) tinted with the
 * category's swatch color.
 *
 * 20×20 viewBox; strokeWidth 1.4, round caps.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = {
  readonly color: string;
  readonly size?: number;
};

const STROKE = 1.4;
// Rounded square outline with a small centered dot.
const PATH_D =
  'M3.4 3.4 L16.4 3.4 Q16.8 3.4 16.8 3.8 L16.8 16.4 Q16.8 16.8 16.4 16.8 L3.6 16.8 Q3.2 16.8 3.2 16.4 L3.2 3.8 Q3.2 3.4 3.4 3.4 Z ' +
  'M9.4 9.6 Q10.0 8.8 10.8 9.4 Q11.2 10.2 10.4 10.8 Q9.6 10.8 9.4 9.6 Z';

export function BaseCategoryIcon({ color, size = 20 }: Props): React.JSX.Element {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(PATH_D), []);
  const scale = size / 20;
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
