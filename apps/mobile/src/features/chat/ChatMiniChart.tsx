/**
 * ChatMiniChart — Skia sparkline + donut + bar in assistant bubbles.
 *
 * Token-name color resolver: maps 'accent'|'sage'|'accentSoft'|'textMuted'
 * to actual COLORS values. Unknown token names fall back to textMuted
 * (T-03-03-04 UI-side defense in depth).
 *
 * Entrance animation: withDelay(300, withTiming(progress 0→1, 600ms)).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { sparklinePath, donutArcs, barLayout } from './chatChartGeometry';
import type { ChartPayload } from '@services/aiQuery';

// ---------------------------------------------------------------------------
// Token-name color resolver (T-03-03-04 + T-03-03-05)
// ---------------------------------------------------------------------------

const CHART_COLOR_RESOLVER: Record<string, string> = {
  accent: COLORS.accent,
  sage: COLORS.sage,
  accentSoft: COLORS.accentSoft,
  textMuted: COLORS.textMuted,
};

function resolveColor(token: string): string {
  return CHART_COLOR_RESOLVER[token] ?? COLORS.textMuted;
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------

const SPARK_W = 240;
const SPARK_H = 48;
const SPARK_STROKE = 1.5;

function MiniSparkline({ values, color }: { values: number[]; color: string }): React.JSX.Element {
  const pathD = React.useMemo(() => sparklinePath(values, SPARK_W, SPARK_H), [values]);
  const skPath = React.useMemo(
    () => (pathD ? Skia.Path.MakeFromSVGString(pathD) : null),
    [pathD],
  );

  if (!skPath) return <View style={{ height: SPARK_H }} />;

  return (
    <Canvas style={{ width: SPARK_W, height: SPARK_H }}>
      <Path
        path={skPath}
        color={resolveColor(color)}
        style="stroke"
        strokeWidth={SPARK_STROKE}
        strokeCap="round"
        strokeJoin="round"
      />
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Donut
// ---------------------------------------------------------------------------

const DONUT_SIZE = 96;
const DONUT_RADIUS = 36;
const DONUT_STROKE = 8;

function MiniDonut({
  slices,
}: {
  slices: { label: string; value: number; color: string }[];
}): React.JSX.Element {
  const arcs = React.useMemo(() => donutArcs(slices, DONUT_RADIUS, DONUT_STROKE), [slices]);
  // Top 2 slices for labels
  const top2 = [...slices].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 2);

  return (
    <View style={styles.donutWrap}>
      <Canvas style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        {arcs.map((arc, i) => {
          const p = Skia.Path.MakeFromSVGString(arc.d);
          if (!p) return null;
          return (
            <Path
              key={i}
              path={p}
              color={resolveColor(arc.color)}
              style="stroke"
              strokeWidth={DONUT_STROKE}
              strokeCap="butt"
            />
          );
        })}
      </Canvas>
      {top2.length > 0 && (
        <View style={styles.donutLabels}>
          {top2.map((sl, i) => (
            <View key={i} style={styles.donutLabelRow}>
              <View style={[styles.donutDot, { backgroundColor: resolveColor(sl.color) }]} />
              <Text style={styles.donutLabelText} numberOfLines={1}>
                {sl.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bar chart
// ---------------------------------------------------------------------------

const BAR_W = 240;
const BAR_H = 72;
const BAR_V_PAD = 20;

function MiniBar({ bars }: { bars: { label: string; value: number }[] }): React.JSX.Element {
  const layout = React.useMemo(() => barLayout(bars, BAR_W, BAR_H, BAR_V_PAD), [bars]);

  return (
    <View>
      <Canvas style={{ width: BAR_W, height: BAR_H }}>
        {layout.map((b, i) => {
          const rect = Skia.Path.Make();
          const r = 3; // RADIUS.sm equivalent for bar tops
          rect.addRRect(
            { rect: { x: b.x, y: b.y, width: b.w, height: b.h }, rx: r, ry: r },
          );
          return <Path key={i} path={rect} color={COLORS.accent} style="fill" />;
        })}
      </Canvas>
      <View style={[styles.barLabels, { width: BAR_W }]}>
        {layout.map((b, i) => (
          <Text
            key={i}
            style={[styles.barLabel, { width: b.w, left: b.x }]}
            numberOfLines={1}
          >
            {b.label.length > 8 ? b.label.slice(0, 7) + '…' : b.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ChatMiniChart (public)
// ---------------------------------------------------------------------------

type Props = {
  readonly chart: ChartPayload;
};

export function ChatMiniChart({ chart }: Props): React.JSX.Element {
  return (
    <View style={styles.container} accessible={false}>
      {chart.kind === 'sparkline' && (
        <MiniSparkline values={chart.values} color="accent" />
      )}
      {chart.kind === 'donut' && <MiniDonut slices={chart.slices} />}
      {chart.kind === 'bar' && <MiniBar bars={chart.bars} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.md,
    alignItems: 'flex-start',
  },
  donutWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  donutLabels: {
    gap: 4,
  },
  donutLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  donutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  donutLabelText: {
    ...TYPE.uiLabel,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  barLabels: {
    position: 'relative',
    height: BAR_V_PAD,
  },
  barLabel: {
    ...TYPE.uiLabel,
    position: 'absolute',
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
