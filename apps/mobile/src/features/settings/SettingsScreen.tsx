/**
 * SOLDI Settings screen.
 *
 * D-06: stack route reached via gear in dashboard header (not a 5th tab).
 * Phase 4 scope: Language section only. Biometric + export are Phase 5.
 *
 * Design: RN primitives, StyleSheet.create, tokens, TYPE.* presets.
 * Accessibility: every interactive element has accessibilityLabel + accessibilityRole.
 */

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { LanguageToggle } from './LanguageToggle';

export function SettingsScreen(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
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
