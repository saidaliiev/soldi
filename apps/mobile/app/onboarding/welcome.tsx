/**
 * Welcome screen — language pick (EN | UK).
 *
 * Design:
 * - Reanimated v4 entrance animation (opacity + translateY).
 * - Two large Pressable tiles, one per language.
 * - token-only colours (no inline hex).
 * - accessibilityRole 'radio' on each tile (language options behave like radio buttons).
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  StyleSheet,
  type PressableStateCallbackType,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';
import { setLanguage as changeI18nLanguage } from '@lib/i18n';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WelcomeScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  // Entrance animation
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    translateY.value = withTiming(0, { duration: 600 });
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const handlePick = (lng: 'en' | 'uk') => {
    useOnboardingStore.getState().setLanguage(lng);
    void changeI18nLanguage(lng).then(() => {
      router.push('/onboarding/data-source');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {/* W6 §1: decorative donut mark (concentric View rings, palette-correct).
            Accepted drift from HTML §1 SVG dasharray rings — react-native-svg
            is not in deps and adding it triggers a native rebuild; Skia would
            be overkill for a static decoration. The two-ring + center-dot View
            approximation preserves the palette story (terracotta + moss) and
            the same 116pt diameter envelope. */}
        <View style={styles.donutWrap} pointerEvents="none">
          <View style={styles.donutOuterRing} />
          <View style={styles.donutInnerRing} />
          <View style={styles.donutCenterDot} />
        </View>

        {/* Hero text */}
        <View style={styles.heroSection}>
          <Text style={styles.title}>
            {t('onboarding.welcome_title')}
          </Text>
          <Text style={styles.subtitle}>
            {t('onboarding.welcome_subtitle')}
          </Text>
        </View>

        {/* Language picker label */}
        <Text style={styles.pickLabel}>
          {t('onboarding.pick_language')}
        </Text>

        {/* Language tiles */}
        <View style={styles.tilesContainer}>
          <Pressable
            onPress={() => handlePick('en')}
            accessibilityRole="radio"
            accessibilityLabel="English"
            style={({ pressed }: PressableStateCallbackType) => [
              styles.tile,
              pressed && styles.tilePressed,
            ]}
          >
            <Text style={styles.tileText}>
              {t('onboarding.language_en')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handlePick('uk')}
            accessibilityRole="radio"
            accessibilityLabel="Ukrainian / Українська"
            style={({ pressed }: PressableStateCallbackType) => [
              styles.tile,
              pressed && styles.tilePressed,
            ]}
          >
            <Text style={styles.tileText}>
              {t('onboarding.language_uk')}
            </Text>
          </Pressable>
        </View>

        {/* W6 §1: page-dot indicator (3 dots, first wide-accent). */}
        <View style={styles.dots} pointerEvents="none">
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles — token-only, no inline hex
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
  },
  donutWrap: {
    width: 116,
    height: 116,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  donutOuterRing: {
    position: 'absolute',
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 7,
    borderColor: COLORS.accent,
  },
  donutInnerRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 7,
    borderColor: COLORS.sage,
  },
  donutCenterDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.textPrimary,
  },
  heroSection: {
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPE.displayL,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -0.5,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPE.editorialLead,
    fontSize: 19,
    lineHeight: 28,
    color: COLORS.textSecondary,
  },
  pickLabel: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tilesContainer: {
    gap: SPACING.md,
  },
  tile: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    minHeight: 64,
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  tilePressed: {
    opacity: 0.85,
  },
  tileText: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 7,
    marginTop: SPACING.lg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${COLORS.textPrimary}2E`, // 18% alpha
  },
  dotActive: {
    width: 22,
    backgroundColor: COLORS.accent,
  },
});
