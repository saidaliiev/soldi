/**
 * TransactionRow — row with swipe-left "Categorize" reveal.
 *
 * Wave 3 design-sync (soldify-screens.html:222-244, checkpoint RESOLVED
 * 2026-05-19): circular tinted category-icon badge + plain muted category
 * meta text (CategoryChip dropped ON THIS SURFACE only — still used by the
 * recategorize sheet / filter modal). Expense amount conforms to the
 * authority `--accent` (COLORS.accent); income stays COLORS.income. A
 * content hairline separates rows. A subtle one-shot list-enter (governed
 * MOTION.listRowEnter via useRowEnter) plays on the list's first paint and
 * is recycle-safe (no animation on scroll/FlashList recycle).
 *
 * UI-SPEC §Animation Contract (preserved): swipe-left worklet, clamp at
 * -120pt, snap open at -60pt, withSpring(damping 20, stiffness 200).
 * Reveal labeled t('transactions.action_categorize'); tap opens
 * RecategorizeBottomSheet via useRecategorizeStore.openFor(tx.id).
 * Row tap → router.push(`/transactions/${tx.id}`).
 *
 * Security: never console.log merchant or amount (CLAUDE.md + T-02-03-04).
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@lib/money';
import { DEFAULT_CATEGORY_EMOJI } from '@data/categoryEmojis';
import { useRowEnter } from '@design/useMotion';

import { useRecategorizeStore } from './recategorizeStore';
import type { Transaction } from './types';

type Props = {
  readonly tx: Transaction;
  readonly locale?: string;
};

const REVEAL_WIDTH = 120;
const OPEN_THRESHOLD = 60;
const SPRING_CONFIG = { damping: 20, stiffness: 200 } as const;
// Circular icon badge: category color at ~14% fill, icon stroked full color.
const BADGE_BG_ALPHA = '24';
// Content hairline between rows — codebase `${COLORS.textMuted}<alpha>` convention.
const HAIRLINE_ALPHA = '26';

export function TransactionRow({ tx, locale = 'en-IE' }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const rowEnter = useRowEnter();
  const openFor = useRecategorizeStore((s) => s.openFor);

  const expense = tx.amountCents < 0;
  const amountColor = expense ? COLORS.accent : COLORS.income;
  const formattedAmount = formatMoney(
    { amountCents: Math.abs(tx.amountCents), currency: tx.currency },
    locale,
  );
  const signedAmount = `${expense ? '−' : '+'} ${formattedAmount}`;

  const categoryName = tx.categoryName ?? 'Other';
  const categoryColor = tx.categoryColor ?? COLORS.textMuted;
  const categoryEmoji = tx.categoryEmoji ?? DEFAULT_CATEGORY_EMOJI;

  const goToDetail = React.useCallback(() => {
    router.push({ pathname: '/transactions/[id]', params: { id: String(tx.id) } });
  }, [tx.id]);

  const triggerRecategorize = React.useCallback(() => {
    openFor(tx.id);
    translateX.value = withSpring(0, SPRING_CONFIG);
  }, [openFor, tx.id, translateX]);

  // D-09 / QUAL-03: VoiceOver alternative for the swipe-left recategorize
  // gesture. accessibilityActions exposes the same action without the swipe
  // VoiceOver intercepts.
  const handleAccessibilityAction = React.useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      if (event.nativeEvent.actionName === 'recategorize') {
        openFor(tx.id);
      }
    },
    [openFor, tx.id],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((e) => {
      // Only allow leftward drag — clamp to [-REVEAL_WIDTH, 0]
      const next = Math.max(-REVEAL_WIDTH, Math.min(0, e.translationX));
      translateX.value = next;
    })
    .onEnd((e) => {
      if (e.translationX < -OPEN_THRESHOLD) {
        translateX.value = withSpring(-REVEAL_WIDTH, SPRING_CONFIG);
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const tap = Gesture.Tap()
    .maxDistance(8)
    .onEnd((_, success) => {
      if (success) {
        runOnJS(goToDetail)();
      }
    });

  const composed = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Reveal action layer — sits behind the row */}
      <View style={styles.revealLayer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Pressable
          style={({ pressed }) => [styles.revealAction, pressed && styles.revealActionPressed]}
          onPress={triggerRecategorize}
          accessibilityRole="button"
          accessibilityLabel={t('transactions.action_categorize')}
        >
          <Text style={styles.revealEmoji} allowFontScaling={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {DEFAULT_CATEGORY_EMOJI}
          </Text>
          <Text style={styles.revealLabel} allowFontScaling numberOfLines={1}>
            {t('transactions.action_categorize')}
          </Text>
        </Pressable>
      </View>

      {/* Foreground row (gesture target + one-shot list-enter) */}
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[styles.row, animatedStyle]}
          entering={rowEnter}
          accessibilityRole="button"
          accessibilityLabel={`${tx.merchantName}, ${signedAmount}, ${categoryName}`}
          accessibilityHint="Double-tap to view details. Swipe left to recategorize."
          accessibilityActions={[{ name: 'recategorize', label: t('transactions.action_categorize') }]}
          onAccessibilityAction={handleAccessibilityAction}
        >
          <View
            style={[styles.badge, { backgroundColor: `${categoryColor}${BADGE_BG_ALPHA}` }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.badgeEmoji} allowFontScaling={false}>
              {categoryEmoji}
            </Text>
          </View>
          <View style={styles.left}>
            <Text style={styles.merchant} numberOfLines={1} allowFontScaling>
              {tx.merchantName}
            </Text>
            <Text style={styles.category} numberOfLines={1} allowFontScaling>
              {categoryName}
            </Text>
          </View>
          <View style={styles.right}>
            <Text
              style={[styles.amount, { color: amountColor }]}
              allowFontScaling
              numberOfLines={1}
            >
              {signedAmount}
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.textMuted}${HAIRLINE_ALPHA}`,
  },
  revealLayer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  revealAction: {
    width: REVEAL_WIDTH,
    height: '100%',
    backgroundColor: COLORS.accentDeep,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: SPACING.xs,
    minWidth: 44,
    minHeight: 44,
  },
  revealActionPressed: {
    backgroundColor: COLORS.accent,
  },
  revealLabel: {
    ...TYPE.uiMeta,
    color: COLORS.white,
  },
  row: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    columnGap: SPACING.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    // Sized to match the previous 20pt SVG icon — leaves the tinted badge
    // backdrop visible around the glyph.
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  revealEmoji: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
  },
  left: {
    flex: 1,
    rowGap: SPACING.xs,
  },
  right: {
    alignItems: 'flex-end',
  },
  merchant: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
  },
  category: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
  },
  amount: {
    ...TYPE.tabular,
    fontVariant: ['tabular-nums'],
  },
});
