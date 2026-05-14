/**
 * Transactions tab icon — three slightly-varied horizontal lines (list).
 *
 * Rendered via Skia Canvas + Path (project stack — no react-native-svg dep).
 * 24×24 viewBox; strokeWidth 1.6, round caps. D-21 hand-drawn aesthetic.
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

// Three lines with slightly varied lengths + a small leading dot per line
// to evoke a "list with bullets" feel without being perfectly geometric.
const PATH_D =
  // line 1 — bullet + bar
  'M5.3 7.0 L5.6 7.0 ' +
  'M8.4 7.0 L19.4 7.1 ' +
  // line 2
  'M5.3 12.0 L5.6 12.0 ' +
  'M8.4 12.0 L17.6 12.1 ' +
  // line 3
  'M5.3 17.0 L5.6 17.0 ' +
  'M8.4 17.0 L18.8 16.9';

export function TransactionsIcon({ color, size = 24 }: Props): React.JSX.Element {
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
