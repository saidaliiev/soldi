/**
 * ChatEmptyState — shown when no messages exist in the conversation.
 *
 * UI-SPEC §ChatEmptyState:
 * - Illustration 120×120pt, top margin SPACING.xxl (48pt)
 * - Phrase: TYPE.editorialBody italic, COLORS.textPrimary, mt SPACING.lg
 * - Sub-phrase: TYPE.uiLabel, COLORS.textMuted, centered, mt SPACING.md mb SPACING.md
 * - 3 PromptSuggestionChips stacked, SPACING.sm gap, centered
 * - Entrance: withDelay(150, withTiming) opacity 0→1 + translateY 8→0, 300ms cubic-out
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useMotion } from '@design/useMotion';
import { ChatEmptyIllustration } from '@design/illustrations/chat-empty';
import { getRelativeMonthLabel } from '@lib/relativeMonth';
import { getCategoryBreakdown } from '@data/dashboardRepo';
import { localizedCategoryName } from '@data/categoriesRepo';
import { PromptSuggestionChip } from './PromptSuggestionChip';

type Props = {
  readonly onSubmitPrompt: (prompt: string) => void;
};

export function ChatEmptyState({ onSubmitPrompt }: Props): React.JSX.Element {
  const { t, i18n } = useTranslation();

  const { withMotion } = useMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  // Governed enter (was ad-hoc withDelay(150, withTiming 300 cubic)). The
  // 150ms lead is dropped — the boundary exposes no governed delay primitive
  // and CLAUDE.md bans ad-hoc literals; a clean fade-in is the compliant form.
  React.useEffect(() => {
    opacity.value = withMotion(1, 'chatBubbleEnter');
    translateY.value = withMotion(0, 'chatBubbleEnter');
  }, [opacity, translateY, withMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // Sprint E5 — parameterise suggestion pills so they don't read as
  // abandonware on June 1. Pill #1 escapes the literal "groceries" assumption
  // by deriving last month's top spending category; pill #2 resolves month
  // names per locale. Both fall through to safe literals when there's no DB
  // signal yet (cold-start, no transactions).
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-IE';
  const prompts = React.useMemo(() => {
    const today = new Date();
    const thisMonthLabel = getRelativeMonthLabel(0, locale, today);
    const prevMonthLabel = getRelativeMonthLabel(-1, locale, today);

    let categoryPrompt: string;
    try {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const breakdown = getCategoryBreakdown(prev.getFullYear(), prev.getMonth() + 1);
      const top = breakdown.top[0];
      if (top != null) {
        const name = localizedCategoryName(top, i18n.language).toLowerCase();
        categoryPrompt = t('chat.prompt_category_last_month', { category: name });
      } else {
        categoryPrompt = t('chat.prompt_category_last_month_fallback');
      }
    } catch {
      categoryPrompt = t('chat.prompt_category_last_month_fallback');
    }

    return [
      categoryPrompt,
      t('chat.prompt_compare_months', {
        thisMonth: thisMonthLabel,
        prevMonth: prevMonthLabel,
      }),
      t('chat.prompt_top_merchants'),
    ] as const;
  }, [t, locale, i18n.language]);

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <View
        style={styles.illustration}
        accessibilityRole="image"
        accessibilityLabel="Open book illustration"
      >
        <ChatEmptyIllustration size={120} />
      </View>

      <Text
        style={styles.phrase}
        accessibilityRole="text"
        allowFontScaling
      >
        {t('chat.empty_phrase')}
      </Text>

      <Text style={styles.subPhrase} allowFontScaling>
        {t('chat.empty_subphrase')}
      </Text>

      <View style={styles.chips}>
        {prompts.map((prompt) => (
          <PromptSuggestionChip
            key={prompt}
            label={prompt}
            onSubmit={onSubmitPrompt}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  illustration: {
    marginTop: SPACING.xxl,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phrase: {
    ...TYPE.editorialBody,
    fontStyle: 'italic',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  subPhrase: {
    ...TYPE.uiLabel,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
  },
  chips: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
});
