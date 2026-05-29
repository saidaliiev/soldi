/**
 * ActivitySegmentedFilter — Cold Minimal single-row segmented filter.
 *
 * Figma 24:4 (Activity): one segmented control — All / Income / Expenses / Subs.
 * Replaces the prior 3-row ActivityDefaultFilters discovery (category + date +
 * sign). Sign axis is driven here; the "Subs" segment is a shortcut to the
 * subscriptions category. Search + amount axes still surface as removable pills
 * via FilterPillsRow; the standalone search modal owns those.
 *
 * Store safety: `sign` is a primitive selector (stable); `categoryIds` is an
 * array, read via useShallow to avoid the useSyncExternalStore render loop that
 * bit this screen before (commit a2474ca).
 */

import React from 'react';
import { Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';

import { COLORS, SPACING, RADIUS } from '@design/tokens';
import { TYPE } from '@design/typography';
import { useFilterStore } from './filterStore';
import { getCategoryIdBySlug } from '@data/categoriesRepo';

type Segment = 'all' | 'income' | 'expense' | 'subs';

export function ActivitySegmentedFilter(): React.JSX.Element {
  const { t } = useTranslation();

  const sign = useFilterStore((s) => s.sign);
  const categoryIds = useFilterStore(useShallow((s) => s.categoryIds));
  const setSign = useFilterStore((s) => s.setSign);
  const setCategoryIds = useFilterStore((s) => s.setCategoryIds);
  const clearAll = useFilterStore((s) => s.clearAll);

  // Resolve once — subscriptions is a default category (sync op-sqlite read).
  const [subsId] = React.useState<number | null>(() => getCategoryIdBySlug('subscriptions'));

  const active: Segment = React.useMemo(() => {
    if (subsId != null && categoryIds.length === 1 && categoryIds[0] === subsId) return 'subs';
    if (categoryIds.length === 0) {
      if (sign === 'income') return 'income';
      if (sign === 'expense') return 'expense';
    }
    return 'all';
  }, [sign, categoryIds, subsId]);

  const segments = React.useMemo(() => {
    const base: readonly { key: Segment; label: string }[] = [
      { key: 'all', label: t('transactions.sign_all') },
      { key: 'income', label: t('transactions.sign_income') },
      { key: 'expense', label: t('transactions.seg_expenses') },
    ];
    return subsId != null
      ? [...base, { key: 'subs' as Segment, label: t('transactions.seg_subs') }]
      : base;
  }, [subsId, t]);

  const select = (key: Segment) => {
    switch (key) {
      case 'all':
        clearAll();
        break;
      case 'income':
        setCategoryIds([]);
        setSign('income');
        break;
      case 'expense':
        setCategoryIds([]);
        setSign('expense');
        break;
      case 'subs':
        if (subsId != null) {
          setSign('both');
          setCategoryIds([subsId]);
        }
        break;
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {segments.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <Pressable
            key={key}
            onPress={() => select(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.segment,
              isActive && styles.segmentActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[styles.label, isActive && styles.labelActive]}
              allowFontScaling
              numberOfLines={1}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  segment: {
    height: 32,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...TYPE.uiLabel,
    color: COLORS.textSecondary,
  },
  labelActive: {
    color: COLORS.white,
  },
});
