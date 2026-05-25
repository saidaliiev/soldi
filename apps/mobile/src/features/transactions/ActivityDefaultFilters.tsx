/**
 * ActivityDefaultFilters — Sprint D6 (DEFAULT-SET).
 *
 * Always-visible filter discovery row at the top of the Activity tab. Wires
 * a curated default set so the screen earns its name on first paint with
 * zero user input. Three sub-rows:
 *
 *   1. Top-3 spending categories this month (auto-derived via
 *      getCategoryBreakdown). Tap toggles the category in filterStore.
 *   2. Sign toggle — All / Expense / Income (mutually exclusive,
 *      "All" default-on, drives filterStore.sign).
 *   3. Date scope — This month / Last month / Custom (mutually exclusive;
 *      Custom navigates to /transactions/search where the date pickers
 *      live; This/Last write directly to filterStore.dateRange).
 *
 * Hidden when there are no transactions yet (the parent screen renders the
 * "empty_initial" copy instead — discovery pills with nothing to discover
 * would just be chrome).
 *
 * Visual: HTML §3 pill atom — sandstone-tinted surface fill for inactive
 * pills, accent fill for active. Reuses existing tokens — no banned hex,
 * no inline-style hex.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, router } from 'expo-router';

import { COLORS, RADIUS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { getCategoryBreakdown } from '@data/dashboardRepo';
import { localizedCategoryName } from '@data/categoriesRepo';

import { useFilterStore } from './filterStore';
import type { FilterSign } from './types';
import type { CategorySlice } from '@/src/features/dashboard/types';

type DateScope = 'this-month' | 'last-month' | 'custom' | 'none';

const DEFAULT_TOP_N = 3;

// ---------------------------------------------------------------------------
// Helpers — pure
// ---------------------------------------------------------------------------

function monthRangeISO(
  offset: number,
  today: Date = new Date(),
): { fromISO: string; toISO: string } {
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1, 0, 0, 0, 0);
  const end = new Date(
    today.getFullYear(),
    today.getMonth() + offset + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { fromISO: start.toISOString(), toISO: end.toISOString() };
}

function detectDateScope(
  fromISO: string | null,
  toISO: string | null,
  today: Date = new Date(),
): DateScope {
  if (fromISO == null && toISO == null) return 'none';
  const thisRange = monthRangeISO(0, today);
  const lastRange = monthRangeISO(-1, today);
  if (fromISO === thisRange.fromISO && toISO === thisRange.toISO) return 'this-month';
  if (fromISO === lastRange.fromISO && toISO === lastRange.toISO) return 'last-month';
  return 'custom';
}

// ---------------------------------------------------------------------------
// Pill atom
// ---------------------------------------------------------------------------

type PillRole = 'button' | 'radio';

type PillProps = {
  readonly label: string;
  readonly on: boolean;
  readonly onPress: () => void;
  readonly a11yLabel?: string;
  // 'button' = multi-select (category strip — picking one doesn't deselect
  // others). 'radio' = mutually exclusive within a radiogroup (sign + scope
  // strips). VoiceOver reads "radio button, selected" so the user knows
  // picking a different one will deselect the current.
  readonly role?: PillRole;
};

function Pill({
  label,
  on,
  onPress,
  a11yLabel,
  role = 'button',
}: PillProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={{ selected: on }}
      accessibilityLabel={a11yLabel ?? label}
      hitSlop={{ top: 8, bottom: 8 }}
      style={[styles.pill, on ? styles.pillOn : styles.pillOff]}
    >
      <Text
        style={[styles.pillLabel, on ? styles.pillLabelOn : styles.pillLabelOff]}
        numberOfLines={1}
        allowFontScaling
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActivityDefaultFilters(): React.JSX.Element | null {
  const { t, i18n } = useTranslation();

  const filter = useFilterStore(
    useShallow((s) => ({
      categoryIds: s.categoryIds,
      sign: s.sign,
      dateFromISO: s.dateFromISO,
      dateToISO: s.dateToISO,
    })),
  );
  const setCategoryIds = useFilterStore((s) => s.setCategoryIds);
  const setSign = useFilterStore((s) => s.setSign);
  const setDateRange = useFilterStore((s) => s.setDateRange);

  // Top-3 categories: derive once per focus from current-month breakdown.
  const [topCategories, setTopCategories] = useState<readonly CategorySlice[]>([]);
  useFocusEffect(
    useCallback(() => {
      try {
        const today = new Date();
        const breakdown = getCategoryBreakdown(today.getFullYear(), today.getMonth() + 1);
        setTopCategories(breakdown.top.slice(0, DEFAULT_TOP_N));
      } catch {
        setTopCategories([]);
      }
    }, []),
  );

  const dateScope = useMemo(
    () => detectDateScope(filter.dateFromISO, filter.dateToISO),
    [filter.dateFromISO, filter.dateToISO],
  );

  const toggleCategory = useCallback(
    (id: number) => {
      const next = filter.categoryIds.includes(id)
        ? filter.categoryIds.filter((x) => x !== id)
        : [...filter.categoryIds, id];
      setCategoryIds(next);
    },
    [filter.categoryIds, setCategoryIds],
  );

  const pickSign = useCallback(
    (s: FilterSign) => setSign(s),
    [setSign],
  );

  const pickDateScope = useCallback(
    (scope: Exclude<DateScope, 'none'>) => {
      const today = new Date();
      if (scope === 'this-month') {
        const r = monthRangeISO(0, today);
        // Toggle off on second tap so the user can clear the date axis.
        if (dateScope === 'this-month') {
          setDateRange(null, null);
        } else {
          setDateRange(r.fromISO, r.toISO);
        }
      } else if (scope === 'last-month') {
        const r = monthRangeISO(-1, today);
        if (dateScope === 'last-month') {
          setDateRange(null, null);
        } else {
          setDateRange(r.fromISO, r.toISO);
        }
      } else {
        // 'custom' — defer the pickers to the search modal which owns them.
        router.push('/transactions/search');
      }
    },
    [dateScope, setDateRange],
  );

  return (
    <View style={styles.root} accessibilityLabel="Default filters">
      {topCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {topCategories.map((cat) => {
            const id = cat.categoryId;
            // 'other' bucket has categoryId=-1 from getCategoryBreakdown; skip
            // it since selecting it doesn't map to a real filter axis.
            if (id < 0) return null;
            const on = filter.categoryIds.includes(id);
            const label = localizedCategoryName(cat, i18n.language);
            return (
              <Pill
                key={`cat-${id}`}
                label={label}
                on={on}
                onPress={() => toggleCategory(id)}
              />
            );
          })}
        </ScrollView>
      )}

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('transactions.sign_group_a11y')}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          <Pill
            role="radio"
            label={t('transactions.sign_all')}
            on={filter.sign === 'both'}
            onPress={() => pickSign('both')}
          />
          <Pill
            role="radio"
            label={t('transactions.sign_expense')}
            on={filter.sign === 'expense'}
            onPress={() => pickSign('expense')}
          />
          <Pill
            role="radio"
            label={t('transactions.sign_income')}
            on={filter.sign === 'income'}
            onPress={() => pickSign('income')}
          />
        </ScrollView>
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('transactions.scope_group_a11y')}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          <Pill
            role="radio"
            label={t('transactions.scope_this_month')}
            on={dateScope === 'this-month'}
            onPress={() => pickDateScope('this-month')}
          />
          <Pill
            role="radio"
            label={t('transactions.scope_last_month')}
            on={dateScope === 'last-month'}
            onPress={() => pickDateScope('last-month')}
          />
          <Pill
            role="radio"
            label={t('transactions.scope_custom')}
            on={dateScope === 'custom'}
            onPress={() => pickDateScope('custom')}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    rowGap: SPACING.xs,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  row: {
    paddingHorizontal: SPACING.lg,
    columnGap: SPACING.sm,
    flexDirection: 'row',
  },
  pill: {
    height: 32,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  pillOff: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: `${COLORS.textMuted}33`,
  },
  pillOn: {
    backgroundColor: COLORS.accent,
  },
  pillLabel: {
    ...TYPE.uiLabel,
  },
  pillLabelOff: {
    color: COLORS.textPrimary,
  },
  pillLabelOn: {
    color: COLORS.white,
  },
});
