/**
 * SOLDI Settings screen (Wave 6: HTML §8 layout).
 *
 * Reached via gear control in dashboard header. Stack header hidden;
 * in-body Oswald 30pt title carries the heading instead.
 *
 * D-06 / Phase 5 / W6: Security (biometric) + Preferences (language) +
 * Notifications (digest) + Data (CSV export). Each section gets an
 * uppercase moss-text (sageDark) label above a grouped card on
 * COLORS.surface with SHADOWS.card. No "Sign out" row — Soldify is
 * offline-first with no remote auth.
 *
 * Design: RN primitives, StyleSheet.create, tokens, TYPE.* presets.
 * Accessibility: every interactive element has accessibilityLabel + role.
 */

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { COLORS, SPACING, RADIUS, SHADOWS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { LanguageToggle } from './LanguageToggle';
import { BiometricToggle } from './BiometricToggle';
import { DigestToggle } from './DigestToggle';
import { ExportButton } from './ExportButton';

export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: SPACING.md + insets.top, paddingBottom: SPACING.xxl + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={t('settings.title')}
    >
      {/* W6: in-body back affordance — native bar hidden in app/_layout.tsx. */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('settings.back', { defaultValue: 'Back' })}
        style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
      >
        <Text style={styles.backLabel} allowFontScaling>‹ {t('settings.back', { defaultValue: 'Back' })}</Text>
      </Pressable>

      <Text style={styles.screenTitle} accessibilityRole="header" allowFontScaling>
        {t('settings.title')}
      </Text>

      {/* Security section — biometric app-open gate (SET-01 / SET-04) */}
      <Text style={styles.sectionLabel} allowFontScaling>
        {t('settings.security_section')}
      </Text>
      <View style={styles.card}>
        <BiometricToggle />
      </View>

      {/* Preferences section — language */}
      <Text style={styles.sectionLabel} allowFontScaling>
        {t('settings.language_section')}
      </Text>
      <View style={styles.card}>
        <LanguageToggle />
      </View>

      {/* Notifications section — 09:00 daily digest opt-in (NOTIF-01 / D-03) */}
      <Text style={styles.sectionLabel} allowFontScaling>
        {t('settings.notifications_section')}
      </Text>
      <View style={styles.card}>
        <DigestToggle />
      </View>

      {/* Data section — CSV export (SET-03 / D-02) */}
      <Text style={styles.sectionLabel} allowFontScaling>
        {t('settings.data_section')}
      </Text>
      <View style={styles.card}>
        <ExportButton />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
  },
  backRow: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
  },
  backLabel: {
    ...TYPE.uiBody,
    color: COLORS.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  screenTitle: {
    ...TYPE.displayM,
    fontSize: 30,
    lineHeight: 36,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    ...TYPE.uiLabel,
    color: COLORS.sageDark,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
});
