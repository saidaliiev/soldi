/**
 * Jar icon set — 6 hand-drawn SVG path icons for the jar icon picker.
 *
 * All rendered via Skia Canvas + Path (project stack — no react-native-svg dep).
 * 24×24 viewBox; strokeWidth 1.6, round caps + joins. Hand-drawn aesthetic
 * per D-21 — slight coordinate irregularity, not geometric perfection.
 *
 * Props:
 *   color: stroke color (comes via prop — no inline hex)
 *   size:  rendered square size in points (default 24)
 *
 * Banned: no inline hex, no emoji, no lucide, no raster.
 * Icon slugs: 'jar-piggy' | 'jar-plane' | 'jar-star' | 'jar-cloud' |
 *             'jar-leaf' | 'jar-home'
 */

import React from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type Props = {
  readonly color: string;
  readonly size?: number;
};

const STROKE = 1.6;

// ---------------------------------------------------------------------------
// SVG path data — each icon in a 24×24 viewBox, hand-drawn feel
// ---------------------------------------------------------------------------

// Piggy bank: rounded body + snout + ear + leg lines
const PIGGY_D =
  'M4.2 14.2 Q4.0 9.0 8.8 7.8 Q11.0 7.2 13.4 7.8 Q18.0 9.0 18.2 14.2 Q18.4 18.0 14.0 19.0 L13.6 21.0 L10.4 21.0 L10.0 19.0 Q5.8 18.0 4.2 14.2 Z ' +
  'M13.2 7.6 Q13.6 5.6 15.4 5.2 Q17.0 5.0 17.6 6.4 ' +
  'M17.0 13.2 Q17.4 13.6 17.2 14.0 ' +
  'M9.0 13.0 Q9.2 13.4 8.8 13.8 Q8.4 14.0 8.2 13.6 Q8.0 13.2 8.4 13.0 Z';

// Airplane / travel: simple plane silhouette
const PLANE_D =
  'M3.0 12.0 L14.0 6.0 Q17.0 4.6 18.6 6.0 Q20.2 7.4 18.8 10.0 L12.0 21.0 L10.0 16.0 L5.0 18.0 Z ' +
  'M10.0 16.0 L14.0 10.0';

// Star: 5-point star
const STAR_D =
  'M12.0 3.2 L13.8 8.8 L19.6 8.8 L15.0 12.4 L16.8 18.0 L12.0 14.4 L7.2 18.0 L9.0 12.4 L4.4 8.8 L10.2 8.8 Z';

// Cloud: savings cloud
const CLOUD_D =
  'M6.4 17.0 Q3.0 16.8 3.2 13.4 Q3.4 10.4 6.6 10.2 Q6.8 7.0 10.0 6.6 Q13.0 6.2 14.4 8.8 Q16.0 8.0 17.8 9.0 Q20.4 10.4 20.2 13.2 Q20.0 16.8 16.6 17.0 Z ' +
  'M8.0 17.0 L8.0 20.4 M12.0 17.0 L12.0 21.0 M16.0 17.0 L16.0 20.0';

// Leaf: nature / eco savings
const LEAF_D =
  'M12.0 20.0 Q8.0 16.0 7.0 11.0 Q6.0 6.0 12.0 4.0 Q18.0 6.0 17.0 11.0 Q16.0 16.0 12.0 20.0 Z ' +
  'M12.0 20.0 L12.0 4.0 ' +
  'M12.0 12.0 Q14.4 9.6 16.4 8.6 ' +
  'M12.0 15.0 Q9.6 12.6 7.6 11.6';

// Home: house / rent fund
const HOME_D =
  'M3.6 11.4 L12.0 4.0 L20.4 11.4 ' +
  'M5.8 9.6 L5.8 19.8 L10.4 19.8 L10.4 14.6 L13.6 14.6 L13.6 19.8 L18.2 19.8 L18.2 9.6';

const PATHS: Record<JarIconSlug, string> = {
  'jar-piggy': PIGGY_D,
  'jar-plane': PLANE_D,
  'jar-star': STAR_D,
  'jar-cloud': CLOUD_D,
  'jar-leaf': LEAF_D,
  'jar-home': HOME_D,
};

export type JarIconSlug =
  | 'jar-piggy'
  | 'jar-plane'
  | 'jar-star'
  | 'jar-cloud'
  | 'jar-leaf'
  | 'jar-home';

export const JAR_ICON_SLUGS: readonly JarIconSlug[] = [
  'jar-piggy',
  'jar-plane',
  'jar-star',
  'jar-cloud',
  'jar-leaf',
  'jar-home',
];

type IconProps = Props & { readonly slug: JarIconSlug };

export function JarIcon({ slug, color, size = 24 }: IconProps): React.JSX.Element {
  const pathD = PATHS[slug];
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(pathD), [pathD]);
  const scale = size / 24;

  if (path == null) {
    return <Canvas style={{ width: size, height: size }} />;
  }

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

// ---------------------------------------------------------------------------
// JarsIcon — fourth tab bar icon (piggy bank / jar motif)
// Exported separately so _layout.tsx can import it alongside the other tab icons.
// ---------------------------------------------------------------------------

// Simple jar/pot shape for the tab bar
const JARS_TAB_D =
  'M7.8 4.0 L16.2 4.0 Q17.0 4.0 17.4 4.8 L18.6 7.6 Q19.0 8.4 18.6 9.0 L18.0 10.2 L18.0 19.4 Q18.0 20.0 17.4 20.0 L6.6 20.0 Q6.0 20.0 6.0 19.4 L6.0 10.2 L5.4 9.0 Q5.0 8.4 5.4 7.6 L6.6 4.8 Q7.0 4.0 7.8 4.0 Z ' +
  'M5.2 9.0 L18.8 9.0 ' +
  'M9.6 4.0 L9.2 2.6 M14.4 4.0 L14.8 2.6';

export function JarsIcon({ color, size = 24 }: Props): React.JSX.Element {
  const path = React.useMemo(() => Skia.Path.MakeFromSVGString(JARS_TAB_D), []);
  const scale = size / 24;

  if (path == null) {
    return <Canvas style={{ width: size, height: size }} />;
  }

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
