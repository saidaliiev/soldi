/**
 * SOLDI Settings screen.
 *
 * D-06: stack route reached via gear in dashboard header (not a 5th tab).
 * Phase 5: Language + Security (biometric toggle) + Notifications (digest
 * toggle) + Data (CSV export) sections.
 *
 * Design: RN primitives, StyleSheet.create, tokens, TYPE.* presets.
 * Accessibility: every interactive element has accessibilityLabel + accessibilityRole.
 * Section order: Language → Security → Notifications → Data.
 */

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { LanguageToggle } from './LanguageToggle';
import { BiometricToggle } from './BiometricToggle';
import { DigestToggle } from './DigestToggle';
import { ExportButton } from './ExportButton';

export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();
  // Bottom inset only: the native Stack header (app/_layout.tsx
  // name="settings", headerShown default true) already insets the top status
  // bar — adding a top inset here would double-pad. insets.bottom clears the
  // home-indicator so the last card / scroll end isn't occluded.
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: SPACING.xxl + insets.bottom }]}
      showsVerticalScrollIndicator={false}
      accessibilityLabel={t('settings.title')}
    >
      {/* Language section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel} allowFontScaling>
          {t('settings.language_section')}
        </Text>
        <View style={styles.card}>
          <LanguageToggle />
        </View>
      </View>

      {/* Security section — biometric app-open gate (SET-01 / SET-04) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel} allowFontScaling>
          {t('settings.security_section')}
        </Text>
        <View style={styles.card}>
          <BiometricToggle />
        </View>
      </View>

      {/* Notifications section — 09:00 daily digest opt-in (NOTIF-01 / D-03) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel} allowFontScaling>
          {t('settings.notifications_section')}
        </Text>
        <View style={styles.card}>
          <DigestToggle />
        </View>
      </View>

      {/* Data section — CSV export (SET-03 / D-02) */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel} allowFontScaling>
          {t('settings.data_section')}
        </Text>
        <View style={styles.card}>
          <ExportButton />
        </View>
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
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionLabel: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
});
