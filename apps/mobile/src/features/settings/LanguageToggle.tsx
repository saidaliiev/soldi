/**
 * LanguageToggle — segmented EN | Українська control for Settings.
 *
 * D-07 contract: on select, MUST:
 *   1. call setLanguage(lng) from @lib/i18n (i18next changeLanguage)
 *   2. call useOnboardingStore.getState().setLanguage(lng) (persists to expo-secure-store)
 *   3. the root _layout.tsx reads the persisted language and applies key={language} on the
 *      app-wide wrapper, which forces a full React subtree remount — retranslating module-scope
 *      t(), Intl.DateTimeFormat date headers, and FlashList sticky headers without restart.
 *
 * Security (T-04-03-02): language pref goes through expo-secure-store via the onboarding store
 * adapter. Never AsyncStorage. Never logged.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { setLanguage as i18nSetLanguage } from '@lib/i18n';
import { useOnboardingStore } from '@stores/onboarding';

type Language = 'en' | 'uk';

type OptionProps = {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
};

function LanguageOption({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: OptionProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
      ]}
      hitSlop={8}
    >
      <Text
        style={[styles.optionText, selected && styles.optionTextSelected]}
        allowFontScaling
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function LanguageToggle(): React.JSX.Element {
  const { t } = useTranslation();
  const language = useOnboardingStore((s) => s.language) ?? 'en';

  const handleSelect = useCallback(
    async (lng: Language) => {
      if (lng === language) return;
      // 1. Persist to expo-secure-store via onboarding store (T-04-03-02)
      useOnboardingStore.getState().setLanguage(lng);
      // 2. Switch i18next runtime language — triggers useTranslation() hooks
      await i18nSetLanguage(lng);
      // 3. Root key-bump fires automatically: _layout.tsx reads the persisted
      //    language from the store and applies key={language} on I18nextProvider,
      //    which remounts the entire app subtree. This retranslates module-scope
      //    t(), Intl.DateTimeFormat date headers, and FlashList sticky headers.
    },
    [language]
  );

  return (
    <View
      style={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('settings.language_section')}
    >
      <LanguageOption
        label={t('settings.language_en')}
        selected={language === 'en'}
        onPress={() => void handleSelect('en')}
        accessibilityLabel={t('settings.language_en')}
      />
      <View style={styles.divider} />
      <LanguageOption
        label={t('settings.language_uk')}
        selected={language === 'uk'}
        onPress={() => void handleSelect('uk')}
        accessibilityLabel={t('settings.language_uk')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${COLORS.textMuted}33`,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    minHeight: 44,
  },
  optionSelected: {
    backgroundColor: COLORS.accent,
  },
  optionPressed: {
    opacity: 0.75,
  },
  optionText: {
    ...TYPE.uiButton,
    color: COLORS.textSecondary,
  },
  optionTextSelected: {
    color: COLORS.white,
  },
  divider: {
    width: 1,
    backgroundColor: `${COLORS.textMuted}33`,
  },
});
