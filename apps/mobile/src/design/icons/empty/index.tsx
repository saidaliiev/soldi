/**
 * Empty-state illustrations (Phase 2 dashboard + downstream variants).
 *
 * 120×120 viewBox; hand-drawn Skia paths (no react-native-svg dep).
 * Each illustration uses brand palette (textPrimary outline + accent details).
 *
 * Variants:
 *   - EmptyIllustrationFlower (default — exported from its own file)
 *   - EmptyIllustrationWindow — future-month state
 *   - EmptyIllustrationCup — no-search-results (used by 02-03)
 *   - EmptyIllustrationBranches — no-categories (used by 02-04)
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

import { COLORS } from '@design/tokens';

export { EmptyIllustrationFlower } from './EmptyIllustrationFlower';

type Props = {
  readonly size?: number;
};

const STROKE = 1.8;

// Open window — simple rectangle with inner cross + a curtain corner
const WINDOW_D =
  'M30 28 L90 28 L90 92 L30 92 Z ' +
  'M60 28 L60 92 ' +
  'M30 60 L90 60 ' +
  'M30 28 Q42 36 38 50';

export function EmptyIllustrationWindow({ size = 120 }: Props): React.JSX.Element {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(WINDOW_D), []);
  const scale = size / 120;
  if (path == null) return <Canvas style={{ width: size, height: size }} />;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={COLORS.textPrimary}
        style="stroke"
        strokeWidth={STROKE * scale}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  );
}

// Upturned coffee cup — saucer arc + cup outline
const CUP_D =
  // saucer arc
  'M22 80 Q60 96 98 80 ' +
  // cup body upside-down
  'M38 74 Q44 56 60 54 Q76 56 82 74 ' +
  // handle
  'M82 64 Q92 62 92 70 Q92 78 82 74';

export function EmptyIllustrationCup({ size = 120 }: Props): React.JSX.Element {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(CUP_D), []);
  const scale = size / 120;
  if (path == null) return <Canvas style={{ width: size, height: size }} />;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={COLORS.textPrimary}
        style="stroke"
        strokeWidth={STROKE * scale}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  );
}

// Bare branches — three thin curved lines fanning from the bottom center
const BRANCH_D =
  'M60 100 Q56 78 48 62 Q44 56 38 50 ' +
  'M60 100 Q62 78 64 56 Q66 48 64 38 ' +
  'M60 100 Q66 80 76 68 Q82 60 86 54';

export function EmptyIllustrationBranches({ size = 120 }: Props): React.JSX.Element {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(BRANCH_D), []);
  const scale = size / 120;
  if (path == null) return <Canvas style={{ width: size, height: size }} />;
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={path}
        color={COLORS.textPrimary}
        style="stroke"
        strokeWidth={STROKE * scale}
        strokeCap="round"
      />
    </Canvas>
  );
}
