/**
 * Data-source screen — STUB (plan 01-01).
 *
 * This screen is a placeholder. The real data-source picker is implemented
 * in plan 01-02. It shows the screen title and subtitle so navigation routing
 * is verifiable.
 */

import React from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';

export default function DataSourceScreen(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('onboarding.pick_source_title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('onboarding.pick_source_subtitle')}
        </Text>
        <View style={styles.stubNotice}>
          <Text style={styles.stubText}>Coming next in plan 01-02</Text>
        </View>
      </ScrollView>
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
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  title: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPE.editorialBody,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  stubNotice: {
    marginTop: SPACING.lg,
  },
  stubText: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
  },
});
