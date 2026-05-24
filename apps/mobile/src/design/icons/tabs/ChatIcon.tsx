/**
 * Chat tab icon — asymmetric rounded-square speech bubble (D2, Sprint D).
 *
 * Rendered via Skia Canvas + Path (project stack — no react-native-svg).
 * 24×24 viewBox; strokeWidth 1.8, round caps/joins. Tail enters bottom
 * edge at x=11, drops to (7, 19.5), straight back up, then bottom-left
 * corner curve — closed bubble, asymmetric right-leaning tail.
 *
 * Path matches docs/design/soldify-screens.html §2/§9 Chat tab glyph.
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

const STROKE = 1.8;

const PATH_D =
  'M4 7 C4 5.3 5.3 4 7 4 ' +
  'H17 ' +
  'C18.7 4 20 5.3 20 7 ' +
  'V13 ' +
  'C20 14.7 18.7 16 17 16 ' +
  'H11 ' +
  'L7 19.5 ' +
  'L7 16 ' +
  'C5.3 16 4 14.7 4 13 ' +
  'Z';

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
