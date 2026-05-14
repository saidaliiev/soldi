/**
 * Pressed-flower / loose-leaf illustration — current-month empty state.
 *
 * 120×120 viewBox; hand-drawn Skia paths (no react-native-svg dep).
 * Brand palette: stem in COLORS.sageDeep, petals in COLORS.accent.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

import { COLORS } from '@design/tokens';

type Props = {
  readonly size?: number;
};

const STROKE = 1.8;

// Stem (curved line from bottom to center) + 5 oval petals around the
// top point — slight irregularity, no perfect symmetry.
const STEM_D = 'M60 108 Q58 90 62 72 Q60 56 58 44';
const LEAF_D = 'M44 78 Q50 70 60 76 Q56 86 44 82 Z';
const PETALS_D =
  // top
  'M58 24 Q66 30 64 42 Q56 44 52 38 Q52 28 58 24 Z ' +
  // upper-left
  'M40 32 Q48 30 52 40 Q46 48 38 44 Q34 38 40 32 Z ' +
  // upper-right
  'M78 32 Q84 38 80 46 Q72 50 66 44 Q66 34 78 32 Z ' +
  // lower-left
  'M44 50 Q52 48 56 56 Q50 64 42 60 Q38 56 44 50 Z ' +
  // lower-right
  'M76 50 Q82 56 78 62 Q70 64 64 56 Q66 50 76 50 Z';

export function EmptyIllustrationFlower({ size = 120 }: Props): React.JSX.Element {
  const stem = React.useMemo(() => Skia.Path.MakeFromSVGString(STEM_D), []);
  const leaf = React.useMemo(() => Skia.Path.MakeFromSVGString(LEAF_D), []);
  const petals = React.useMemo(() => Skia.Path.MakeFromSVGString(PETALS_D), []);
  const scale = size / 120;
  return (
    <Canvas style={{ width: size, height: size }}>
      {stem != null && (
        <Path
          path={stem}
          color={COLORS.sageDeep}
          style="stroke"
          strokeWidth={STROKE * scale}
          strokeCap="round"
        />
      )}
      {leaf != null && (
        <Path
          path={leaf}
          color={COLORS.sageDeep}
          style="stroke"
          strokeWidth={STROKE * scale}
          strokeJoin="round"
        />
      )}
      {petals != null && (
        <Path
          path={petals}
          color={COLORS.accent}
          style="stroke"
          strokeWidth={STROKE * scale}
          strokeJoin="round"
        />
      )}
    </Canvas>
  );
}
