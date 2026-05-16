/**
 * Onboarding biometric opt-in screen — ONBD-04.
 *
 * Explains the Face ID / Touch ID app-open gate and offers Enable / Skip.
 * Enable: runs LocalAuthentication.authenticateAsync; on success persists
 *   biometricEnabled=true then navigates forward.
 * Skip: leaves biometricEnabled=false and navigates forward.
 *
 * Security: biometricEnabled persisted via onboarding store → expo-secure-store.
 * Never AsyncStorage (T-05-04). Auth failure stays at false silently (CLAUDE.md).
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  type PressableStateCallbackType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BiometricOnboardingScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const setBiometricEnabled = useOnboardingStore((s) => s.setBiometricEnabled);
  const setCompleted = useOnboardingStore((s) => s.setCompleted);
  const [loading, setLoading] = useState(false);

  const finishOnboarding = useCallback(() => {
    setCompleted(true);
    router.replace('/(tabs)');
  }, [setCompleted, router]);

  const handleEnable = useCallback(async () => {
    setLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('settings.biometric_label'),
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false, // D-01: OS passcode fallback, no app retry cap
      });
      if (result.success) {
        setBiometricEnabled(true);
      }
      // If not success: gate stays disabled — never log failure detail (CLAUDE.md)
    } catch {
      // Auth threw — gate stays disabled, no log (CLAUDE.md security rule)
    } finally {
      setLoading(false);
      finishOnboarding();
    }
  }, [t, setBiometricEnabled, finishOnboarding]);

  const handleSkip = useCallback(() => {
    setBiometricEnabled(false);
    finishOnboarding();
  }, [setBiometricEnabled, finishOnboarding]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          <Text style={styles.title} allowFontScaling>
            {t('onboarding.biometric_title')}
          </Text>
          <Text style={styles.subtitle} allowFontScaling>
            {t('onboarding.biometric_subtitle')}
          </Text>
        </View>

        {/* Description card */}
        <View style={styles.card}>
          <Text style={styles.description} allowFontScaling>
            {t('settings.biometric_description')}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => void handleEnable()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.biometric_enable')}
            accessibilityState={{ busy: loading }}
            style={({ pressed }: PressableStateCallbackType) => [
              styles.enableButton,
              pressed && styles.buttonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <Text style={styles.enableButtonText} allowFontScaling>
                {t('onboarding.biometric_enable')}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleSkip}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.biometric_skip')}
            style={({ pressed }: PressableStateCallbackType) => [
              styles.skipButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.skipButtonText} allowFontScaling>
              {t('onboarding.biometric_skip')}
            </Text>
          </Pressable>
        </View>
      </View>
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
    gap: SPACING.xl,
  },
  heroSection: {
    gap: SPACING.sm,
  },
  title: {
    ...TYPE.displayL,
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPE.editorialLead,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.card,
  },
  description: {
    ...TYPE.uiBody,
    color: COLORS.textSecondary,
  },
  actions: {
    gap: SPACING.md,
    marginTop: 'auto',
  },
  enableButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  skipButton: {
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  enableButtonText: {
    ...TYPE.uiButton,
    color: COLORS.surface,
  },
  skipButtonText: {
    ...TYPE.uiButton,
    color: COLORS.textMuted,
  },
});
