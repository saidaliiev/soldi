/**
 * ChatEmptyIllustration — open book with a single ink line.
 * 120x120pt canvas, brand palette (terracotta + cream).
 * Hand-drawn aesthetic using Skia paths.
 *
 * References the warm editorial visual language from Phase 1+2 illustrations.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { COLORS } from '@design/tokens';

type Props = {
  readonly size?: number;
};

// Book left page — slightly angled for hand-drawn feel
const LEFT_PAGE_D =
  'M60 92 C40 90 18 88 14 82 L14 32 C14 28 16 26 20 26 C36 27 54 28 60 30 Z';

// Book right page
const RIGHT_PAGE_D =
  'M60 92 C80 90 102 88 106 82 L106 32 C106 28 104 26 100 26 C84 27 66 28 60 30 Z';

// Book spine — the center fold
const SPINE_D = 'M60 28 C60 28 60 90 60 92';

// Single ink line on the left page — decorative
const LINE_LEFT_D = 'M24 50 C30 49.5 45 50.5 56 50';
const LINE_LEFT_2_D = 'M24 60 C30 59.5 42 60.5 54 60';

// Single ink line on the right page
const LINE_RIGHT_D = 'M64 50 C70 49.5 85 50.5 96 50';

export function ChatEmptyIllustration({ size = 120 }: Props): React.JSX.Element {
  const scale = size / 120;

  const leftPage = React.useMemo(() => Skia.Path.MakeFromSVGString(LEFT_PAGE_D), []);
  const rightPage = React.useMemo(() => Skia.Path.MakeFromSVGString(RIGHT_PAGE_D), []);
  const spine = React.useMemo(() => Skia.Path.MakeFromSVGString(SPINE_D), []);
  const lineL = React.useMemo(() => Skia.Path.MakeFromSVGString(LINE_LEFT_D), []);
  const lineL2 = React.useMemo(() => Skia.Path.MakeFromSVGString(LINE_LEFT_2_D), []);
  const lineR = React.useMemo(() => Skia.Path.MakeFromSVGString(LINE_RIGHT_D), []);

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Page fills — warm cream */}
      {leftPage && (
        <Path path={leftPage} color={COLORS.background} style="fill" transform={[{ scale }]} />
      )}
      {rightPage && (
        <Path path={rightPage} color={COLORS.background} style="fill" transform={[{ scale }]} />
      )}
      {/* Page outlines — terracotta accent */}
      {leftPage && (
        <Path
          path={leftPage}
          color={COLORS.accentSoft}
          style="stroke"
          strokeWidth={1.5 / scale}
          strokeCap="round"
          strokeJoin="round"
          transform={[{ scale }]}
        />
      )}
      {rightPage && (
        <Path
          path={rightPage}
          color={COLORS.accentSoft}
          style="stroke"
          strokeWidth={1.5 / scale}
          strokeCap="round"
          strokeJoin="round"
          transform={[{ scale }]}
        />
      )}
      {/* Spine */}
      {spine && (
        <Path
          path={spine}
          color={COLORS.accent}
          style="stroke"
          strokeWidth={2 / scale}
          strokeCap="round"
          transform={[{ scale }]}
        />
      )}
      {/* Ink lines — textMuted */}
      {lineL && (
        <Path
          path={lineL}
          color={COLORS.textMuted}
          style="stroke"
          strokeWidth={1.2 / scale}
          strokeCap="round"
          transform={[{ scale }]}
        />
      )}
      {lineL2 && (
        <Path
          path={lineL2}
          color={COLORS.textMuted}
          style="stroke"
          strokeWidth={1.2 / scale}
          strokeCap="round"
          transform={[{ scale }]}
        />
      )}
      {lineR && (
        <Path
          path={lineR}
          color={COLORS.textMuted}
          style="stroke"
          strokeWidth={1.2 / scale}
          strokeCap="round"
          transform={[{ scale }]}
        />
      )}
    </Canvas>
  );
}
