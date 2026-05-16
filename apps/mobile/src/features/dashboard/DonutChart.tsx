/**
 * DonutChart — Skia arc breakdown of the month's expenses (UI-SPEC §DonutChart).
 *
 * Visual:
 *   200×200pt canvas, 10pt stroke, 2pt slice gap, round caps.
 *   Center label: monthly total by default; morphs to category name + amount
 *   + percentage on slice tap (D-04, 200ms opacity + translateY).
 *
 * Animation on month change (D-05): arc paths are re-derived from the new
 * breakdown; we drive a single shared progress value with withTiming
 * (300ms Easing.out(Easing.cubic)) and the JS-side render reflects the
 * settled state. (Per-slice arc-path interpolation across distinct topologies
 * is a follow-up in plan 02-02 once usePathInterpolation lands — for now we
 * crossfade canvas opacity over the same 300ms window to avoid jank.)
 *
 * Hit-testing: each canvas tap location is converted to polar angle relative
 * to canvas center; the corresponding slice id is resolved from the cached
 * angle list.
 *
 * Performance budget (D-27, QUAL-06): donut first frame < 100ms on populated
 * DB. We log `console.time('donut-first-frame')` / `console.timeEnd` only
 * inside __DEV__ (T-02-01-03 — no PII; informational only).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@lib/money';
import { markFirstFrame } from '@lib/perf';
import { buildDonutArcs, computeSliceAngles } from './donutArcs';
import type { CategoryBreakdown, CategorySlice } from './types';

const CANVAS_SIZE = 200;
const STROKE_WIDTH = 10;
const GAP_DEG = 2;
// Stroke centerline radius — outer ring = CANVAS_SIZE/2 = 100, half-stroke = 5.
const RADIUS = CANVAS_SIZE / 2 - STROKE_WIDTH / 2;

type Props = {
  readonly breakdown: CategoryBreakdown;
  readonly locale?: string;
  readonly currency?: string;
};

export function DonutChart({
  breakdown,
  locale = 'en-IE',
  currency = 'EUR',
}: Props): React.JSX.Element {
  // WR-07: t() for the "Total" center label so it updates on language switch
  const { t } = useTranslation();
  const totalCents = breakdown.totalExpenseCents;
  const [selectedId, setSelectedId] = useState<number | 'other' | null>(null);
  const firstFrameLogged = useRef(false);

  // ---- Arc geometry --------------------------------------------------------

  const arcs = useMemo(
    () => buildDonutArcs(breakdown.top, breakdown.other, RADIUS, STROKE_WIDTH, GAP_DEG),
    [breakdown.top, breakdown.other]
  );

  const angles = useMemo(
    () => computeSliceAngles(breakdown.top, breakdown.other, GAP_DEG),
    [breakdown.top, breakdown.other]
  );

  // Pre-compute SkPath for each arc — useMemo so Skia doesn't reparse on every render.
  const skPaths = useMemo(
    () =>
      arcs.map((a) => {
        const p = Skia.Path.MakeFromSVGString(a.path);
        return { skPath: p, color: a.color, categoryId: a.categoryId };
      }),
    [arcs]
  );

  // ---- D-05: crossfade on month/breakdown change ---------------------------

  const canvasOpacity = useSharedValue(1);
  useEffect(() => {
    canvasOpacity.value = 0.0;
    canvasOpacity.value = withTiming(1.0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    // Reset any selected slice on month change — labels should reset.
    setSelectedId(null);
  }, [breakdown, canvasOpacity]);

  const canvasAnimStyle = useAnimatedStyle(() => ({
    opacity: canvasOpacity.value,
  }));

  // ---- QUAL-06: Skia first-frame mark (perf.ts) ----------------------------
  // Fires once on the first render pass where the chart has data to paint.
  // markFirstFrame() is idempotent — safe across React re-renders (ref guard
  // kept for clarity, but perf.ts guards internally as well).
  // T-05-12: markFirstFrame() logs only the numeric ms — no financial data.

  if (!firstFrameLogged.current) {
    firstFrameLogged.current = true;
    // Defer one frame so the mark fires after the Skia canvas has committed,
    // not before it — gives a more accurate first-paint measurement.
    setTimeout(() => {
      markFirstFrame();
    }, 0);
  }

  // ---- D-04: tap hit-testing on the canvas ---------------------------------

  const handleTap = (x: number, y: number) => {
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy);

    // Outside the ring (with generous hit slop on both sides of the 10pt stroke)?
    if (r < RADIUS - 20 || r > RADIUS + 20) {
      setSelectedId(null);
      return;
    }

    // Compute angle in 0..360, with 0 = top, clockwise (matches donutArcs).
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    for (const a of angles) {
      if (deg >= a.startDeg && deg <= a.endDeg) {
        setSelectedId(a.categoryId);
        return;
      }
    }
    // Tap landed inside a gap or outside any slice — reset.
    setSelectedId(null);
  };

  // ---- Center labels -------------------------------------------------------

  const selectedSlice = useMemo<CategorySlice | null>(() => {
    if (selectedId == null) return null;
    if (selectedId === 'other') return breakdown.other;
    return breakdown.top.find((s) => s.categoryId === selectedId) ?? null;
  }, [selectedId, breakdown]);

  const totalFormatted = formatMoney({ amountCents: totalCents, currency }, locale);

  const a11yLabel = (() => {
    const top = breakdown.top[0];
    if (top == null) return 'Spending donut chart. No data this month.';
    const topPercent = Math.round(top.percentage * 100);
    const topAmount = formatMoney({ amountCents: top.amountCents, currency }, locale);
    return `Spending donut chart. ${top.nameEn} ${topAmount}, ${topPercent}%. Double-tap a slice to see details.`;
  })();

  return (
    <View style={styles.container} accessibilityRole="image" accessibilityLabel={a11yLabel}>
      {/* D-09 / QUAL-01: Canvas + child Paths are decorative — hidden from VoiceOver.
          The outer View summarises the chart content via accessibilityLabel above. */}
      <Animated.View
        style={[styles.canvasWrap, canvasAnimStyle]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Pressable
          onPress={(e) => handleTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          style={styles.pressable}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Canvas style={styles.canvas}>
            {skPaths.map((entry, idx) =>
              entry.skPath == null ? null : (
                <Path
                  key={`${String(entry.categoryId)}-${idx}`}
                  path={entry.skPath}
                  color={entry.color}
                  style="stroke"
                  strokeWidth={STROKE_WIDTH}
                  strokeCap="round"
                />
              )
            )}
          </Canvas>
        </Pressable>
      </Animated.View>

      <View
        style={styles.centerOverlay}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {selectedSlice == null ? (
          <>
            <Text style={styles.totalLabel} allowFontScaling>
              {t('dashboard.donut_total_label')}
            </Text>
            <Text style={styles.totalAmount} allowFontScaling>
              {totalFormatted}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.sliceName} numberOfLines={1} ellipsizeMode="tail" allowFontScaling>
              {selectedSlice.nameEn}
            </Text>
            <Text style={styles.sliceAmount} allowFontScaling>
              {formatMoney({ amountCents: selectedSlice.amountCents, currency }, locale)}
            </Text>
            <Text style={styles.slicePercent} allowFontScaling>
              {`${Math.round(selectedSlice.percentage * 100)}%`}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    alignSelf: 'center',
    marginVertical: SPACING.md,
  },
  canvasWrap: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  pressable: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  canvas: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  totalLabel: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
  },
  totalAmount: {
    ...TYPE.displayL,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  sliceName: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  sliceAmount: {
    ...TYPE.displayL,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  slicePercent: {
    ...TYPE.uiLabel,
    color: COLORS.textSecondary,
  },
});
