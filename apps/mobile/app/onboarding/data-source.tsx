/**
 * Data-source picker screen.
 *
 * Presents four SourceTile options: synthetic, manual, monobank, csv.
 * Tapping a tile writes dataSource to the persisted onboarding store and
 * pushes the user to the source-specific screen.
 *
 * Architectural notes:
 * - dataSource is a TypeScript literal union — never user-typed string (T-01-02-01).
 * - Staggered tile entrances: 0 / 60 / 120 / 180 ms via SourceTile.delayMs.
 * - No AI/network calls on this screen (Phase 3 adds AI pipeline).
 */

import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';
import type { DataSource } from '@stores/onboarding';
import { SourceTile } from '@components/SourceTile';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DataSourceScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const choose = (source: DataSource) => {
    useOnboardingStore.getState().setDataSource(source);
    // Explicit literal routes for expo-router typed routes (T-01-02-01: union, not user-typed)
    if (source === 'synthetic') router.push('/onboarding/synthetic');
    else if (source === 'manual') router.push('/onboarding/manual');
    else if (source === 'monobank') router.push('/onboarding/monobank');
    else router.push('/onboarding/csv');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>
          {t('onboarding.pick_source_title')}
        </Text>
        <Text style={styles.subtitle}>
          {t('onboarding.pick_source_subtitle')}
        </Text>

        {/* Source tiles — explicit order: synthetic, manual, monobank, csv */}
        <View style={styles.tilesContainer}>
          <SourceTile
            title={t('onboarding.source_synthetic_title')}
            body={t('onboarding.source_synthetic_body')}
            iconName="sparkle"
            onPress={() => choose('synthetic')}
            testID="source-tile-synthetic"
            delayMs={0}
          />
          <SourceTile
            title={t('onboarding.source_manual_title')}
            body={t('onboarding.source_manual_body')}
            iconName="pencil"
            onPress={() => choose('manual')}
            testID="source-tile-manual"
            delayMs={60}
          />
          <SourceTile
            title={t('onboarding.source_monobank_title')}
            body={t('onboarding.source_monobank_body')}
            iconName="bank"
            onPress={() => choose('monobank')}
            testID="source-tile-monobank"
            delayMs={120}
          />
          <SourceTile
            title={t('onboarding.source_csv_title')}
            body={t('onboarding.source_csv_body')}
            iconName="file-text"
            onPress={() => choose('csv')}
            testID="source-tile-csv"
            delayMs={180}
          />
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
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
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
  tilesContainer: {
    gap: SPACING.md,
  },
});
