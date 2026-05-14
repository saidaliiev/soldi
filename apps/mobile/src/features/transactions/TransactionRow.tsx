/**
 * TransactionRow — 72pt row with swipe-left "Categorize" reveal.
 *
 * UI-SPEC §TransactionRow + §Animation Contract:
 *   - 72pt height, merchant + category chip on left, amount on right.
 *   - Sign-colored amount (expense=accent, income=sage), tabular-nums.
 *   - Swipe-left worklet on react-native-gesture-handler v2 / reanimated v4;
 *     clamp at -120pt, snap open at -60pt threshold, withSpring(damping 20,
 *     stiffness 200).
 *   - Reveal action labeled t('transactions.action_categorize'); tap opens
 *     RecategorizeBottomSheet via useRecategorizeStore.openFor(tx.id).
 *   - Row tap → router.push(`/transactions/${tx.id}`) (detail screen).
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
import { Misc } from '@design/icons/categories/Misc';

import { CategoryChip } from './CategoryChip';
import { useRecategorizeStore } from './recategorizeStore';
import type { Transaction } from './types';

type Props = {
  readonly tx: Transaction;
  readonly locale?: string;
};

const REVEAL_WIDTH = 120;
const OPEN_THRESHOLD = 60;
const SPRING_CONFIG = { damping: 20, stiffness: 200 } as const;

export function TransactionRow({ tx, locale = 'en-IE' }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const openFor = useRecategorizeStore((s) => s.openFor);

  const expense = tx.amountCents < 0;
  const amountColor = expense ? COLORS.expense : COLORS.income;
  const formattedAmount = formatMoney(
    { amountCents: Math.abs(tx.amountCents), currency: tx.currency },
    locale,
  );
  const signedAmount = `${expense ? '−' : '+'} ${formattedAmount}`;

  const goToDetail = React.useCallback(() => {
    router.push({ pathname: '/transactions/[id]', params: { id: String(tx.id) } });
  }, [tx.id]);

  const triggerRecategorize = React.useCallback(() => {
    openFor(tx.id);
    translateX.value = withSpring(0, SPRING_CONFIG);
  }, [openFor, tx.id, translateX]);

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

  const categoryName = tx.categoryName ?? 'Other';
  const categorySlug = tx.categoryIconSlug;
  const categoryColor = tx.categoryColor;

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
          <Misc color={COLORS.white} size={20} />
          <Text style={styles.revealLabel} allowFontScaling numberOfLines={1}>
            {t('transactions.action_categorize')}
          </Text>
        </Pressable>
      </View>

      {/* Foreground row (gesture target) */}
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[styles.row, animatedStyle]}
          accessibilityRole="button"
          accessibilityLabel={`${tx.merchantName}, ${signedAmount}, ${categoryName}`}
          accessibilityHint="Double-tap to view details. Swipe left to recategorize."
        >
          <View style={styles.left}>
            <Text style={styles.merchant} numberOfLines={1} allowFontScaling>
              {tx.merchantName}
            </Text>
            <View style={styles.chipRow}>
              <CategoryChip slug={categorySlug} name={categoryName} color={categoryColor} />
            </View>
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
  chipRow: {
    flexDirection: 'row',
  },
  amount: {
    ...TYPE.tabular,
    fontVariant: ['tabular-nums'],
  },
});
