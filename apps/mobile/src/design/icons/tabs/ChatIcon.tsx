/**
 * Chat tab icon — speech bubble with an open tail (HTML §2 design).
 *
 * Rendered via Skia Canvas + Path (project stack — no react-native-svg).
 * 24×24 viewBox; strokeWidth 1.6, round caps. D-21 hand-drawn aesthetic —
 * the bubble loop has a deliberate ±0.2 jitter, not a perfect circle.
 *
 * Path: near-closed loop opening at the top-right, with a short tail
 * line extending to the upper-right corner (matches the bubble glyph
 * shown in the HTML reference, soldify-screens.html §2 chat tab).
 *
 * Props:
 *   color: stroke color (active=accent / inactive=textMuted)
 *   size:  square size in pt, default 24.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = {
  readonly color: string;
  readonly size?: number;
};

const STROKE = 1.6;

// Quadratic-Bezier-traced bubble loop opening at the upper-right, with
// a short tail line continuing up-and-out — matches the HTML reference
// glyph `M21 12a8 8 0 1 1-3-6.2L21 4`. Hand-drawn jitter on coords.
const PATH_D =
  // start at right side, sweep down and around the loop (counter-clockwise)
  'M19.0 13.0 ' +
  'Q19.2 18.0 14.2 19.6 ' +
  'Q8.4 21.0 5.6 16.4 ' +
  'Q3.2 11.8 6.6 7.6 ' +
  'Q10.2 3.6 15.4 5.4 ' +
  'Q17.4 6.1 18.0 7.5 ' +
  // tail line up to the upper-right corner
  'M18.0 7.5 L21.0 4.2';

function ChatIconBase({ color, size = 24 }: Props): React.JSX.Element {
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

export const ChatIcon = React.memo(ChatIconBase);
