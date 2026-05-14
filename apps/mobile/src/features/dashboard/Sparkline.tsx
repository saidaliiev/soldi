/**
 * Sparkline — line-only Skia sparkline used inside the DigestCard.
 *
 * 32pt default height, full available width measured via `onLayout`, single
 * stroked Path through the 7 data points. No fill, no axis, no labels —
 * everything subordinate to the editorial card it lives in (D-07).
 *
 * Per UI-SPEC §DigestCard:
 *   stroke = COLORS.accent (overridable via `color`)
 *   strokeWidth = 1.5pt
 *   strokeCap = round
 *   4pt vertical padding so the stroke never clips at the canvas edge.
 *
 * Accessibility: surface as `role="image"` with a static label — sparkline
 * trend is decorative reinforcement of the editorial phrase below it.
 */

import React, { useState } from 'react';
import { View, type LayoutChangeEvent, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

import { COLORS } from '@design/tokens';

type Props = {
  readonly data: readonly number[];
  readonly color?: string;
  readonly height?: number;
};

const DEFAULT_HEIGHT = 32;
const STROKE_WIDTH = 1.5;
const V_PAD = 4;

export function Sparkline({
  data,
  color = COLORS.accent,
  height = DEFAULT_HEIGHT,
}: Props): React.JSX.Element | null {
  const [width, setWidth] = useState<number>(0);

  const onLayout = (e: LayoutChangeEvent): void => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  if (data == null || data.length === 0) return null;

  // Build the Skia path once width is known. Render an empty View on first
  // pass so onLayout can fire (Skia Canvas with width=0 is a no-op).
  const path = width > 0 ? buildPath(data, width, height) : null;

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Spending sparkline, last 7 days"
    >
      {path != null && (
        <Canvas style={{ width, height }}>
          <Path
            path={path}
            color={color}
            style="stroke"
            strokeWidth={STROKE_WIDTH}
            strokeCap="round"
            strokeJoin="round"
          />
        </Canvas>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Path construction
// ---------------------------------------------------------------------------

function buildPath(data: readonly number[], width: number, height: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const n = data.length;
  const yTop = V_PAD;
  const yBottom = height - V_PAD;
  const yMid = (yTop + yBottom) / 2;

  // If only one data point, just render a flat dot-line at mid.
  if (n === 1) {
    path.moveTo(0, yMid);
    path.lineTo(width, yMid);
    return path;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  // Flat series (all zeros, or all equal) → render at vertical center.
  const yFor = (v: number): number => {
    if (range <= 0) return yMid;
    // Higher value → higher on screen (smaller y).
    const t = (v - min) / range;
    return yBottom - t * (yBottom - yTop);
  };

  const xStep = n > 1 ? width / (n - 1) : width;

  path.moveTo(0, yFor(data[0]!));
  for (let i = 1; i < n; i++) {
    path.lineTo(i * xStep, yFor(data[i]!));
  }
  return path;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
