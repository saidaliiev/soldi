/**
 * CSV import data source screen — STUB (plan 01-02).
 *
 * Full CSV file-picker and parser logic lands in plan 01-04.
 * This stub provides a navigable destination so the onboarding flow is
 * observable end-to-end after plan 01-02 lands.
 */

import React from 'react';
import { View, Text, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useOnboardingStore } from '@stores/onboarding';
import { PressableButton } from '@components/PressableButton';

export default function CsvScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();

  const handleContinue = () => {
    useOnboardingStore.getState().setCompleted(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {t('onboarding.source_csv_title')}
        </Text>
        <Text style={styles.body}>
          {t('onboarding.source_csv_body')}
        </Text>
        <View style={styles.actions}>
          <PressableButton
            label={t('common.continue')}
            onPress={handleContinue}
            accessibilityLabel={t('common.continue')}
            testID="csv-continue-button"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  title: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  body: {
    ...TYPE.editorialBody,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  actions: {
    marginTop: SPACING.lg,
  },
});
