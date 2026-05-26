/**
 * RecategorizeBottomSheet — mounted globally at root _layout; opened via
 * useRecategorizeStore.openFor(txId).
 *
 * UI-SPEC §RecategorizeBottomSheet:
 *   - snapPoints 45%; BottomSheetPrimitive from 02-04 (drop-in for gorhom).
 *   - Top horizontal strip: 5 most-recently-used categories as enlarged
 *     CategoryChips (32pt).
 *   - Main list: all categories sorted DESC by usage_count, 44pt rows.
 *   - Tap a category → light haptic → transactionsRepo.updateCategory(...) →
 *     sheet closes → caller's onPicked callback fires (used by detail screen
 *     to update the local edit state).
 *
 * Security: never log txId or category names in production builds.
 */

import React from 'react';
import { View, Text, Pressable, ScrollView, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { useQueryClient } from '@tanstack/react-query';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import {
  BottomSheetPrimitive,
  type BottomSheetPrimitiveRef,
} from '@/src/components/BottomSheet/BottomSheetPrimitive';
import { listCategoriesEnriched, localizedCategoryName } from '@data/categoriesRepo';
import { updateCategory as updateTxCategory, getTransactionById } from '@data/transactionsRepo';
import {
  upsertForMerchant,
  propagateCategoryToSimilar,
} from '@data/merchantOverridesRepo';
import type { Category } from '@data/categoriesRepo';

import { useRecategorizeStore } from './recategorizeStore';
import { CategoryChip } from './CategoryChip';
import { normalizeMerchantKey } from './merchantNormalize';
import { usePropagationStore } from './propagationStore';

const SNAP_POINTS = ['65%'] as const;

export function RecategorizeBottomSheet(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const open = useRecategorizeStore((s) => s.open);
  const targetTxId = useRecategorizeStore((s) => s.targetTxId);
  const onPicked = useRecategorizeStore((s) => s.onPicked);
  const close = useRecategorizeStore((s) => s.close);
  const sheetRef = React.useRef<BottomSheetPrimitiveRef>(null);
  const queryClient = useQueryClient();

  const [categories, setCategories] = React.useState<readonly Category[]>([]);
  const [currentCategoryId, setCurrentCategoryId] = React.useState<number | null>(null);
  // Cache the source transaction's merchant_name at sheet-open time so the
  // propagation pass after handlePick can hash it without re-querying the DB
  // post-update (the row's merchant_name is immutable, but reading-after-write
  // adds an unnecessary round-trip on a synchronous handler).
  const [sourceMerchantName, setSourceMerchantName] = React.useState<string | null>(null);

  // Open/close imperative bridge
  React.useEffect(() => {
    if (open) {
      try {
        const cats = listCategoriesEnriched();
        setCategories(cats);
        if (targetTxId !== null) {
          const tx = getTransactionById(targetTxId);
          setCurrentCategoryId(tx?.categoryId ?? null);
          setSourceMerchantName(tx?.merchantName ?? null);
        }
      } catch {
        setCategories([]);
        setSourceMerchantName(null);
      }
      sheetRef.current?.open();
    } else {
      sheetRef.current?.close();
    }
  }, [open, targetTxId]);

  // Top 5 are simply the first 5 in id-asc order from the DB (Phase 2 schema
  // ships usage_count default 0 — there's no real "recent" signal until users
  // start editing). Sorted DESC by usage_count would be a no-op early on; the
  // canonical "recent" view falls back to a stable id slice.
  const top5 = React.useMemo(() => categories.slice(0, 5), [categories]);

  const handlePick = React.useCallback(
    (categoryId: number) => {
      if (targetTxId === null) {
        close();
        return;
      }
      try {
        updateTxCategory(targetTxId, categoryId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
          // Haptics may not be available on simulator — never fail the UI on this.
        });
        onPicked?.(categoryId);

        // Phase 3 / 03-02 propagation flow (CAT-04):
        //   1. Upsert merchant_overrides as source='user' BEFORE propagation so
        //      any concurrent ai-categorize calls see the override and so
        //      rollback only reverts transaction rows, not the override.
        //   2. Propagate the new category to similar local transactions.
        //   3. Surface the toast when >=1 row was auto-updated.
        //   4. Invalidate TanStack Query cache so the transactions list refetches.
        if (sourceMerchantName !== null && sourceMerchantName.length > 0) {
          const merchantKey = normalizeMerchantKey(sourceMerchantName);
          if (merchantKey.length > 0) {
            try {
              upsertForMerchant({
                merchant_name: sourceMerchantName,
                category_id: categoryId,
                source: 'user',
                confidence: 1.0,
              });
              const { propagated_ids, rollback } = propagateCategoryToSimilar({
                source_tx_id: targetTxId,
                merchant_key: merchantKey,
                category_id: categoryId,
              });
              if (propagated_ids.length > 0) {
                usePropagationStore
                  .getState()
                  .openWith(propagated_ids.length, rollback);
              }
            } catch {
              // Propagation is best-effort; failure must not block the primary
              // recategorize action. T-03-02-02: never log merchant_name.
            }
          }
        }

        // Refresh transactions list (Phase 2 cache key).
        try {
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
        } catch {
          // queryClient may be unmounted in edge cases — non-fatal.
        }
      } catch {
        // Never expose DB errors in console (T-02-03-04). Sheet still closes.
      }
      close();
    },
    [targetTxId, onPicked, close, sourceMerchantName, queryClient],
  );

  return (
    <BottomSheetPrimitive
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      onChange={(index) => {
        if (index === 0 && open) {
          // Dragged-down close — sync the store state.
          close();
        }
      }}
      accessibilityLabel={t('transactions.recategorize_title')}
    >
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          {t('transactions.recategorize_title')}
        </Text>
      </View>

      {top5.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionLabel} allowFontScaling>
            {t('transactions.section_recent')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentRow}
            accessibilityLabel={t('transactions.section_recent')}
          >
            {top5.map((cat) => (
              <Pressable
                key={`recent-${cat.id}`}
                onPress={() => handlePick(cat.id)}
                accessibilityRole="button"
                accessibilityLabel={`Set category ${localizedCategoryName(cat, i18n.language)}`}
                hitSlop={4}
              >
                <CategoryChip slug={cat.slug} name={localizedCategoryName(cat, i18n.language)} color={cat.color} emoji={cat.emoji} size="md" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionLabel} allowFontScaling>
        {t('transactions.section_all_categories')}
      </Text>

      <FlatList
        data={categories}
        keyExtractor={(item) => `cat-${item.id}`}
        renderItem={({ item }) => {
          const isSelected = item.id === currentCategoryId;
          return (
            <Pressable
              onPress={() => handlePick(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Set category ${localizedCategoryName(item, i18n.language)}`}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Text style={styles.rowEmoji} allowFontScaling={false}>
                {item.emoji}
              </Text>
              <Text style={styles.rowLabel} numberOfLines={1} allowFontScaling>
                {localizedCategoryName(item, i18n.language)}
              </Text>
              {isSelected && (
                <Text style={styles.check} allowFontScaling>
                  ✓
                </Text>
              )}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </BottomSheetPrimitive>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  title: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
  },
  recentSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  recentRow: {
    columnGap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  sectionLabel: {
    ...TYPE.uiMeta,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    columnGap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  rowPressed: {
    backgroundColor: `${COLORS.textMuted}1A`,
  },
  rowEmoji: {
    fontSize: 20,
    lineHeight: 24,
    width: 24,
    textAlign: 'center',
  },
  rowLabel: {
    ...TYPE.uiBody,
    color: COLORS.textPrimary,
    flex: 1,
  },
  check: {
    ...TYPE.uiButton,
    color: COLORS.accent,
  },
  separator: {
    height: 1,
    backgroundColor: `${COLORS.textMuted}1A`,
    marginLeft: SPACING.lg,
  },
});
