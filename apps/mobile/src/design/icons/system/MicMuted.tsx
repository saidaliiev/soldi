/**
 * MicMuted — disabled microphone icon stub (Phase 5 voice).
 * Standard mic shape with a diagonal slash overlay.
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = {
  readonly size?: number;
  readonly color?: string;
};

// Mic body: rounded rectangle top, curved base
const MIC_PATH_D =
  'M12 1 C9.8 1 8 2.8 8 5 L8 12 C8 14.2 9.8 16 12 16 C14.2 16 16 14.2 16 12 L16 5 C16 2.8 14.2 1 12 1 Z ' +
  'M5 10 C5 10 5 15 12 15 C19 15 19 10 19 10 ' +
  'M12 16 L12 21 ' +
  'M9 21 L15 21';

// Slash overlay
const SLASH_PATH_D = 'M3 3 L21 21';

export function MicMuted({ size = 24, color = '#000000' }: Props): React.JSX.Element {
  const micPath = React.useMemo(() => Skia.Path.MakeFromSVGString(MIC_PATH_D), []);
  const slashPath = React.useMemo(() => Skia.Path.MakeFromSVGString(SLASH_PATH_D), []);
  const scale = size / 24;

  return (
    <Canvas style={{ width: size, height: size }}>
      {micPath && (
        <Path
          path={micPath}
          color={color}
          style="stroke"
          strokeWidth={1.6 / scale}
          strokeCap="round"
          strokeJoin="round"
          transform={[{ scale }]}
        />
      )}
      {slashPath && (
        <Path
          path={slashPath}
          color={color}
          style="stroke"
          strokeWidth={1.6 / scale}
          strokeCap="round"
          transform={[{ scale }]}
        />
      )}
    </Canvas>
  );
}
