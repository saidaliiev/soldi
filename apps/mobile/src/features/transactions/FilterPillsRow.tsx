/**
 * FilterPillsRow — horizontal strip of active-axis pills with × dismissals.
 *
 * UI-SPEC §FilterPillsRow: COLORS.accent bg, COLORS.white text, × icon.
 * Hidden when isEmptyFilter(filter) is true.
 *
 * Pills built (in display order): search, categories, amount, sign, date.
 * Tapping × on a pill calls filterStore.removeFilterAxis(axisKey).
 */

import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';

import { COLORS, RADIUS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { formatMoney } from '@lib/money';
import { listCategoriesEnriched, localizedCategoryName } from '@data/categoriesRepo';

import { useFilterStore } from './filterStore';
import { isEmptyFilter } from './filterCompose';
import type { FilterAxisKey } from './types';

type PillSpec = {
  readonly key: FilterAxisKey;
  readonly label: string;
};

export function FilterPillsRow(): React.JSX.Element | null {
  const { t, i18n } = useTranslation();
  // useShallow: inline-object selector without shallow equality returns a
  // fresh reference every render → useSyncExternalStore loops. See
  // transactions.tsx for the same pattern.
  const filter = useFilterStore(
    useShallow((s) => ({
      search: s.search,
      categoryIds: s.categoryIds,
      minCents: s.minCents,
      maxCents: s.maxCents,
      sign: s.sign,
      dateFromISO: s.dateFromISO,
      dateToISO: s.dateToISO,
    })),
  );
  const removeAxis = useFilterStore((s) => s.removeFilterAxis);
  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-IE';

  if (isEmptyFilter(filter)) return null;

  const pills: PillSpec[] = [];

  if (filter.search.trim().length > 0) {
    pills.push({
      key: 'search',
      label: t('transactions.filter_search_pill', { search: filter.search }),
    });
  }

  if (filter.categoryIds.length > 0) {
    let label = '';
    try {
      const cats = listCategoriesEnriched();
      const names = filter.categoryIds
        .map((id) => {
          const c = cats.find((cat) => cat.id === id);
          return c != null ? localizedCategoryName(c, i18n.language) : undefined;
        })
        .filter((n): n is string => typeof n === 'string');
      label = names.join(', ');
    } catch {
      label = `${filter.categoryIds.length}`;
    }
    if (label === '') label = `${filter.categoryIds.length}`;
    pills.push({ key: 'categories', label });
  }

  if (filter.minCents !== null || filter.maxCents !== null) {
    const min =
      filter.minCents !== null
        ? formatMoney({ amountCents: filter.minCents, currency: 'EUR' }, locale)
        : '…';
    const max =
      filter.maxCents !== null
        ? formatMoney({ amountCents: filter.maxCents, currency: 'EUR' }, locale)
        : '…';
    pills.push({
      key: 'amount',
      label: t('transactions.filter_amount_pill', { min, max }),
    });
  }

  if (filter.sign !== 'both') {
    pills.push({
      key: 'sign',
      label:
        filter.sign === 'expense'
          ? t('transactions.sign_expense')
          : t('transactions.sign_income'),
    });
  }

  if (filter.dateFromISO !== null || filter.dateToISO !== null) {
    const fmt = (iso: string | null): string => {
      if (iso === null) return '…';
      try {
        const d = new Date(iso);
        return new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'short',
        }).format(d);
      } catch {
        return '…';
      }
    };
    pills.push({
      key: 'date',
      label: t('transactions.filter_date_pill', {
        from: fmt(filter.dateFromISO),
        to: fmt(filter.dateToISO),
      }),
    });
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      accessibilityLabel="Active filters"
    >
      {pills.map((pill) => (
        <View key={pill.key} style={styles.pill} accessibilityLabel={`Filter ${pill.label}`}>
          <Text style={styles.label} numberOfLines={1} allowFontScaling>
            {pill.label}
          </Text>
          <Pressable
            onPress={() => removeAxis(pill.key)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${pill.label}`}
            hitSlop={12}
            style={styles.dismiss}
          >
            <Text style={styles.dismissText} allowFontScaling>
              ×
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    columnGap: SPACING.sm,
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.xs,
    height: 32,
    columnGap: SPACING.xs,
    minWidth: 44,
  },
  label: {
    ...TYPE.uiLabel,
    color: COLORS.white,
  },
  dismiss: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissText: {
    ...TYPE.uiButton,
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 18,
  },
});
