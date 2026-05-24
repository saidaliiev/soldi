/**
 * Onboarding source-method icons (D5, Sprint D).
 *
 * Four 24x24 Skia-Canvas glyphs rendered inside SourceTile's 42x42 badge.
 * Paths sourced from Claude Design D5 handoff (Sprint C reply).
 * Convention: stroke-only, no fill, round caps/joins, strokeWidth 1.7,
 * default color COLORS.accent (sandstone, on rgba(156,91,65,.12) badge bg).
 */

import React from 'react';
import { View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

import { COLORS } from '@design/tokens';

const STROKE = 1.7;
const VIEWBOX = 24;

type IconProps = {
  readonly size?: number;
  readonly color?: string;
};

function SkiaIcon({
  size = 21,
  color = COLORS.accent,
  paths,
}: IconProps & { paths: readonly string[] }): React.JSX.Element {
  const skPaths = React.useMemo(
    () => paths.map((d) => Skia.Path.MakeFromSVGString(d)),
    [paths],
  );
  const scale = size / VIEWBOX;

  if (skPaths.some((p) => p == null)) {
    return <View style={{ width: size, height: size }} />;
  }

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {skPaths.map((path, idx) => (
          <Path
            key={idx}
            path={path!}
            color={color}
            style="stroke"
            strokeWidth={STROKE}
            strokeCap="round"
            strokeJoin="round"
            transform={[{ scale }]}
            origin={{ x: 0, y: 0 }}
          />
        ))}
      </Canvas>
    </View>
  );
}

/* ─── Sparkles — sample data */
const SPARKLES_PATHS: readonly string[] = [
  'M12 3 L13.3 9.7 L20 11 L13.3 12.3 L12 19 L10.7 12.3 L4 11 L10.7 9.7 Z',
  'M18 4 L18.5 6 L20.5 6.5 L18.5 7 L18 9 L17.5 7 L15.5 6.5 L17.5 6 Z',
];

export function SparkleIcon(props: IconProps): React.JSX.Element {
  return <SkiaIcon {...props} paths={SPARKLES_PATHS} />;
}

/* ─── Pencil — manual entry */
const PENCIL_PATHS: readonly string[] = [
  'M4 20 L8 19 L19 8 L16 5 L5 16 Z',
  'M14 7 L17 10',
];

export function PencilIcon(props: IconProps): React.JSX.Element {
  return <SkiaIcon {...props} paths={PENCIL_PATHS} />;
}

/* ─── Link — monobank token */
const LINK_PATHS: readonly string[] = [
  'M10 14 C8 12 8 9 10 7 L13 4 C15 2 18 2 20 4 C22 6 22 9 20 11 L18 13',
  'M14 10 C16 12 16 15 14 17 L11 20 C9 22 6 22 4 20 C2 18 2 15 4 13 L6 11',
];

export function BankIcon(props: IconProps): React.JSX.Element {
  return <SkiaIcon {...props} paths={LINK_PATHS} />;
}

/* ─── ArrowDownTray — CSV import */
const ARROW_DOWN_TRAY_PATHS: readonly string[] = [
  'M12 4 V15',
  'M7 11 L12 16 L17 11',
  'M4 20 H20',
];

export function FileTextIcon(props: IconProps): React.JSX.Element {
  return <SkiaIcon {...props} paths={ARROW_DOWN_TRAY_PATHS} />;
}

/* ─── Mapping registry — keyed by SourceTile iconName prop */
export const SOURCE_ICONS: Record<string, React.ComponentType<IconProps>> = {
  sparkle: SparkleIcon,
  pencil: PencilIcon,
  bank: BankIcon,
  'file-text': FileTextIcon,
};
