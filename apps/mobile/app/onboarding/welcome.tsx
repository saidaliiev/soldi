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
  heroSection: {
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPE.displayL,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPE.editorialLead,
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
});
