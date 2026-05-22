/**
 * BiometricToggle — Face ID / Touch ID app-open gate toggle.
 *
 * Security (T-05-04): biometricEnabled persists only inside the 'soldi-onboarding'
 * secure-store blob via the onboarding store. Never AsyncStorage.
 *
 * Turning ON requires a successful LocalAuthentication.authenticateAsync call
 * before setBiometricEnabled(true) is called. Turning OFF persists false immediately.
 * Auth failure or throw → flag stays false, no retry cap (OS handles lockout — D-01).
 */

import React, { useCallback } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';

export function BiometricToggle(): React.JSX.Element {
  const { t } = useTranslation();
  const biometricEnabled = useOnboardingStore((s) => s.biometricEnabled);
  const setBiometricEnabled = useOnboardingStore((s) => s.setBiometricEnabled);

  const handleValueChange = useCallback(
    async (value: boolean) => {
      if (!value) {
        // Turning OFF — persist immediately, no auth needed
        setBiometricEnabled(false);
        return;
      }

      // Turning ON — require successful auth before persisting true (T-05-04)
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t('settings.biometric_label'),
          fallbackLabel: 'Use Passcode',
          disableDeviceFallback: false, // D-01: OS passcode fallback, no app retry cap
        });
        if (result.success) {
          setBiometricEnabled(true);
        }
        // If not success: toggle stays OFF — never log failure detail (CLAUDE.md security rule)
      } catch {
        // Auth threw — toggle stays OFF, no log (CLAUDE.md security rule)
      }
    },
    [t, setBiometricEnabled]
  );

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={t('settings.biometric_label')}
      accessibilityRole="switch"
      accessibilityState={{ checked: biometricEnabled }}
    >
      <View style={styles.textContainer}>
        <Text style={styles.label} allowFontScaling>
          {t('settings.biometric_label')}
        </Text>
        <Text style={styles.description} allowFontScaling>
          {t('settings.biometric_description')}
        </Text>
      </View>
      <Switch
        value={biometricEnabled}
        onValueChange={(value) => void handleValueChange(value)}
        trackColor={{ false: `${COLORS.textMuted}38`, true: COLORS.accent }}
        thumbColor={COLORS.white}
        accessibilityLabel={t('settings.biometric_label')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56, // CLAUDE.md: 44pt min tap target; HTML §8 row rhythm
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...TYPE.uiLabel,
    color: COLORS.textPrimary,
  },
  description: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
  },
});
