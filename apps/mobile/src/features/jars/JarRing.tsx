/**
 * JarRing — animated Skia progress ring for savings jars.
 *
 * Renders a background track ring + a sage-coloured progress arc.
 * The arc fraction = balanceCents / targetCents, clamped to [0,1] in the
 * geometry module (D-04).
 *
 * Animation (D-05): single shared progress value driven by withTiming
 * (300ms Easing.out(Easing.cubic)) + canvas-opacity crossfade on change,
 * matching the DonutChart.tsx idiom. usePathInterpolation is NOT used —
 * checked against installed react-native-reanimated types: the API is absent
 * from the installed build; canonical D-05 crossfade is used instead.
 *
 * Over-funded (balance > target): ring stays full, over_funded i18n label shown
 * below the hero balance (D-04).
 *
 * A11y: one summarising accessibilityLabel on the Canvas wrapper; child Path
 * elements carry no individual labels (Skia canvas a11y contract).
 *
 * Tokens only — no hardcoded hex, no BANNED_COLORS.
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@lib/money';
import { jarRingArcPath } from './jarRingGeometry';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_SIZE = 160;
const STROKE_WIDTH = 12;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  readonly balanceCents: number;
  readonly targetCents: number;
  readonly size?: number;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JarRing({ balanceCents, targetCents, size = DEFAULT_SIZE }: Props): React.JSX.Element {
  const { t } = useTranslation();

  const radius = (size - STROKE_WIDTH) / 2;

  const fraction = targetCents > 0 ? balanceCents / targetCents : 0;
  const isOverFunded = balanceCents > targetCents && targetCents > 0;

  // ---- Geometry -------------------------------------------------------

  // Background track: full ring (use a circle-arc at 359.9°)
  const trackPath = useMemo(() => {
    const p = jarRingArcPath(1, radius, STROKE_WIDTH);
    return Skia.Path.MakeFromSVGString(p);
  }, [radius]);

  // Progress arc path at settled fraction
  const progressPath = useMemo(() => {
    const clampedFraction = Math.min(1, Math.max(0, fraction));
    if (clampedFraction === 0) return null;
    const p = jarRingArcPath(clampedFraction, radius, STROKE_WIDTH);
    return Skia.Path.MakeFromSVGString(p);
  }, [fraction, radius]);

  // ---- D-05: crossfade on fraction change -----------------------------

  const canvasOpacity = useSharedValue(1);
  useEffect(() => {
    canvasOpacity.value = 0;
    canvasOpacity.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [fraction, canvasOpacity]);

  const canvasAnimStyle = useAnimatedStyle(() => ({
    opacity: canvasOpacity.value,
  }));

  // ---- A11y label -----------------------------------------------------

  const balanceStr = formatMoney({ amountCents: balanceCents, currency: 'EUR' });
  const targetStr = formatMoney({ amountCents: targetCents, currency: 'EUR' });
  const pct = targetCents > 0 ? Math.round(Math.min(fraction, 1) * 100) : 0;
  const a11yLabel = t('jars.ring_a11y', {
    balance: balanceStr,
    target: targetStr,
    pct,
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* D-09 / QUAL-01: Animated.View carries the single summarising a11y label
          (ring_a11y). Canvas + child Paths are decorative — hidden individually. */}
      <Animated.View
        style={[styles.canvasWrap, { width: size, height: size }, canvasAnimStyle]}
        accessible
        accessibilityLabel={a11yLabel}
        accessibilityRole="image"
      >
        {/* Canvas children (Skia Path) are decorative — outer Animated.View
            is the single VoiceOver focus target for this ring. */}
        <Canvas
          style={{ width: size, height: size }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {/* Background track */}
          {trackPath != null && (
            <Path
              path={trackPath}
              color={`${COLORS.sage}33`}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
            />
          )}
          {/* Progress arc */}
          {progressPath != null && (
            <Path
              path={progressPath}
              color={COLORS.sage}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              strokeCap="round"
            />
          )}
        </Canvas>
      </Animated.View>

      {/* Center overlay — hero balance; hidden from a11y (ring label above suffices) */}
      <View
        style={[styles.centerOverlay, { width: size, height: size }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          style={[styles.heroAmount, { maxWidth: size - STROKE_WIDTH * 4 }]}
          numberOfLines={1}
          allowFontScaling
          // QUAL-04: Oswald displayL (40pt) center label inside a fixed-size ring.
          // Cap at 1.2× (≈48pt) and use adjustsFontSizeToFit so the amount string
          // shrinks to fit the ring diameter rather than overflowing the canvas.
          maxFontSizeMultiplier={1.2}
          adjustsFontSizeToFit
        >
          {balanceStr}
        </Text>
        {isOverFunded && (
          <Text style={styles.overFundedLabel} numberOfLines={1} allowFontScaling>
            {t('jars.over_funded')}
          </Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
  canvasWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  heroAmount: {
    ...TYPE.displayL,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  overFundedLabel: {
    ...TYPE.uiLabel,
    color: COLORS.sage,
    textAlign: 'center',
    marginTop: 2,
  },
});
