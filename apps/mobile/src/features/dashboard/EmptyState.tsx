/**
 * EmptyState — editorial illustrated empty state (UI-SPEC §EmptyState).
 *
 * Variants:
 *   - current-month       (dashboard.empty_month       — "This month is a blank page.")
 *   - future-month        (dashboard.empty_future      — "No data yet.")
 *   - no-search-results   (transactions.empty_search   — consumed by 02-03)
 *   - no-categories       (categories.empty_custom     — consumed by 02-04)
 *
 * Layout (top to bottom):
 *   illustration (120×120) → italic phrase → CTA button
 *
 * The CTA is rendered as a Pressable wrapping a LinearGradient — but
 * react-native-linear-gradient is not a project dep, so the CTA falls
 * back to a flat COLORS.accent fill with COLORS.white text. Visual
 * polish (gradient) is a follow-up in plan 02-04 once the gradient
 * primitive lands.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { EmptyIllustrationFlower } from '@/src/design/icons/empty/EmptyIllustrationFlower';
import {
  EmptyIllustrationWindow,
  EmptyIllustrationCup,
  EmptyIllustrationBranches,
} from '@/src/design/icons/empty';

export type EmptyStateVariant =
  | 'current-month'
  | 'future-month'
  | 'no-search-results'
  | 'no-categories';

type Props = {
  readonly variant: EmptyStateVariant;
  readonly onCtaPress: () => void;
};

type VariantSpec = {
  readonly i18nKey: string;
  readonly subI18nKey?: string;
  readonly ctaI18nKey: string;
  readonly Illustration: (p: { size?: number }) => React.JSX.Element;
  readonly a11yIllustrationLabel: string;
};

const VARIANTS: Readonly<Record<EmptyStateVariant, VariantSpec>> = {
  'current-month': {
    i18nKey: 'dashboard.empty_month',
    ctaI18nKey: 'dashboard.cta_add_transaction',
    Illustration: EmptyIllustrationFlower,
    a11yIllustrationLabel: 'Pressed flower illustration',
  },
  'future-month': {
    i18nKey: 'dashboard.empty_future',
    subI18nKey: 'dashboard.empty_future_sub',
    ctaI18nKey: 'dashboard.cta_add_transaction',
    Illustration: EmptyIllustrationWindow,
    a11yIllustrationLabel: 'Open window illustration',
  },
  'no-search-results': {
    i18nKey: 'transactions.empty_search',
    ctaI18nKey: 'transactions.clear_filters',
    Illustration: EmptyIllustrationCup,
    a11yIllustrationLabel: 'Empty coffee cup illustration',
  },
  'no-categories': {
    i18nKey: 'categories.empty_custom',
    ctaI18nKey: 'categories.cta_new',
    Illustration: EmptyIllustrationBranches,
    a11yIllustrationLabel: 'Bare branches illustration',
  },
};

export function EmptyState({ variant, onCtaPress }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const spec = VARIANTS[variant];
  const Illustration = spec.Illustration;
  const phrase = t(spec.i18nKey);
  const ctaLabel = t(spec.ctaI18nKey);
  const subPhrase = spec.subI18nKey ? t(spec.subI18nKey) : null;

  return (
    <View style={styles.container}>
      <View
        accessibilityRole="image"
        accessibilityLabel={spec.a11yIllustrationLabel}
      >
        <Illustration size={120} />
      </View>
      <Text
        style={styles.phrase}
        accessibilityRole="text"
        allowFontScaling
      >
        {phrase}
      </Text>
      {subPhrase != null && (
        <Text style={styles.subPhrase} allowFontScaling>
          {subPhrase}
        </Text>
      )}
      <Pressable
        onPress={onCtaPress}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        hitSlop={8}
      >
        <Text style={styles.ctaLabel} allowFontScaling>
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
  },
  phrase: {
    ...TYPE.editorialBody,
    fontStyle: 'italic',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  subPhrase: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  cta: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    minHeight: 48,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaPressed: {
    backgroundColor: COLORS.accentDeep,
  },
  ctaLabel: {
    ...TYPE.uiButton,
    color: COLORS.white,
  },
});
