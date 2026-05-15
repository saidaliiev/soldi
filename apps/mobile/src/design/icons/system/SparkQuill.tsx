/**
 * SparkQuill — quill nib with a small dot (editorial + AI hint).
 *
 * 24x24pt canvas; Skia Canvas + Path (matches project icon pattern).
 * Visual: a quill nib (triangle with curved spine) + small circle dot below.
 * Color prop drives both fill and stroke.
 */

import React from 'react';
import { Canvas, Path, Skia, Circle } from '@shopify/react-native-skia';

type Props = {
  readonly size?: number;
  readonly color?: string;
};

// Quill nib path — triangle with a curved lower edge (24x24 viewBox)
// Tip at bottom-center (12, 20), spreading to shoulder points (4, 6) and (20, 6)
// with a soft S-curve for the quill spine
const QUILL_PATH_D =
  'M12 20 C8 14 4 10 4 6 L12 3 L20 6 C20 10 16 14 12 20 Z ' +
  'M12 20 L12 8'; // quill spine center line

export function SparkQuill({ size = 24, color = '#000000' }: Props): React.JSX.Element {
  const quillPath = React.useMemo(() => Skia.Path.MakeFromSVGString(QUILL_PATH_D), []);
  const scale = size / 24;

  return (
    <Canvas style={{ width: size, height: size }}>
      {quillPath && (
        <Path
          path={quillPath}
          color={color}
          style="stroke"
          strokeWidth={1.6 / scale}
          strokeCap="round"
          strokeJoin="round"
          transform={[{ scale }]}
        />
      )}
      {/* Small dot — AI spark hint */}
      <Circle cx={12 * scale} cy={22 * scale} r={1.5 * scale} color={color} />
    </Canvas>
  );
}
