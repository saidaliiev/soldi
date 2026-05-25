/**
 * TransactionListScreen — primary surface for Phase 2 plan 02-03.
 *
 * UI-SPEC §TransactionListScreen:
 *   - Native header with title + search icon (opens /transactions/search modal).
 *   - FilterPillsRow (auto-hides when no axis active).
 *   - FlashList v2 with sticky date headers + 72pt transaction rows.
 *   - Empty filter result → EmptyState 'no-search-results' with clear CTA.
 *   - Initial empty DB → simple muted text (no future-month illustration —
 *     that's dashboard-specific).
 *
 * URL params: ?categoryId=N (from dashboard CategoryRow tap) replaces the
 * active filter on mount. Other axes are reset for predictability.
 */

import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from 'react-i18next';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { FlashList } from '@shopify/flash-list';

import { COLORS, SPACING } from '@design/tokens';
import { TYPE } from '@design/typography';
import { EmptyState } from '@/src/features/dashboard/EmptyState';

import { useTransactionsList } from '@/src/features/transactions/useTransactionsList';
import { useFilterStore } from '@/src/features/transactions/filterStore';
import { isEmptyFilter } from '@/src/features/transactions/filterCompose';
import { DateHeader } from '@/src/features/transactions/DateHeader';
import { TransactionRow } from '@/src/features/transactions/TransactionRow';
import { FilterPillsRow } from '@/src/features/transactions/FilterPillsRow';
import { ActivityDefaultFilters } from '@/src/features/transactions/ActivityDefaultFilters';
import type { FeedItem } from '@/src/features/transactions/types';

export default function TransactionListScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { feed, stickyIndices, transactions, error } = useTransactionsList();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const setCategoryIds = useFilterStore((s) => s.setCategoryIds);
  const setSearch = useFilterStore((s) => s.setSearch);
  const setMinCents = useFilterStore((s) => s.setMinCents);
  const setMaxCents = useFilterStore((s) => s.setMaxCents);
  const setSign = useFilterStore((s) => s.setSign);
  const setDateRange = useFilterStore((s) => s.setDateRange);
  const clearAll = useFilterStore((s) => s.clearAll);
  // useShallow: inline-object selector without shallow equality returns a
  // fresh reference every render → useSyncExternalStore loops →
  // "Maximum update depth exceeded". Wrap with useShallow so React's
  // snapshot cache is keyed on structural equality.
  const filterSnapshot = useFilterStore(
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

  const locale = i18n.language === 'uk' ? 'uk-UA' : 'en-IE';

  // Consume ?categoryId deep link from dashboard CategoryRow.
  React.useEffect(() => {
    if (params.categoryId == null) return;
    const idStr = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
    if (typeof idStr !== 'string') return;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id <= 0) return;
    setSearch('');
    setCategoryIds([id]);
    setMinCents(null);
    setMaxCents(null);
    setSign('both');
    setDateRange(null, null);
    // Clear the URL param so a re-focus doesn't re-apply it.
    router.setParams({ categoryId: '' });
    // Intentionally only depend on the param to avoid setter-identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.categoryId]);

  const openSearch = React.useCallback(() => {
    router.push('/transactions/search');
  }, []);

  const filterActive = !isEmptyFilter(filterSnapshot);

  return (
    <SafeAreaView style={styles.safe} accessibilityLabel="Transactions screen">
      {/* Wave 3 T5: native header dropped — an in-body Oswald title with
          the SafeAreaView fill continuous from the status-bar edge through
          the title kills the two-tone seam (design-sync defect #1) by
          construction, mirroring the shipped W2 dashboard header. */}
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling numberOfLines={1}>
          {t('dashboard.tab_transactions')}
        </Text>
        <Pressable
          onPress={openSearch}
          accessibilityRole="button"
          accessibilityLabel="Open search and filter"
          hitSlop={12}
          style={styles.searchButton}
        >
          <Text style={styles.searchIcon} allowFontScaling>
            ⌕
          </Text>
        </Pressable>
      </View>

      {/* Sprint D6 (DEFAULT-SET): always-visible discovery row at top.
          Hidden when no transactions exist — the empty_initial copy below
          carries the screen's only message at that point. */}
      {transactions.length > 0 && <ActivityDefaultFilters />}

      {/* Sprint D6 follow-up: skip the axes ActivityDefaultFilters already
          owns (category, sign, date) so we don't render duplicate × pills
          for the same toggled state. Search + amount stay here — the
          search modal is the only place they get set. */}
      <FilterPillsRow excludeAxes={['categories', 'sign', 'date']} />

      {error && (
        <Pressable
          onPress={() => clearAll()}
          accessibilityRole="button"
          accessibilityLabel={t('transactions.error_search')}
          style={styles.errorBanner}
        >
          <Text style={styles.errorText} allowFontScaling>
            {t('transactions.error_search')}
          </Text>
        </Pressable>
      )}

      {transactions.length === 0 && filterActive ? (
        <View style={styles.emptyWrap}>
          <EmptyState variant="no-search-results" onCtaPress={clearAll} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText} allowFontScaling>
            {t('transactions.empty_initial')}
          </Text>
        </View>
      ) : (
        <FlashList
          data={feed as FeedItem[]}
          keyExtractor={(item, index) =>
            item.kind === 'header' ? `h-${item.date}` : `r-${item.tx.id}-${index}`
          }
          getItemType={(item) => item.kind}
          stickyHeaderIndices={[...stickyIndices]}
          // QUAL-05 / FlashList v2.0.2: estimatedItemSize (v1 API) does not exist
          // in v2. In v2, heights are measured after first layout pass — no prop
          // available to pre-declare them. getItemType (already present) is the
          // v2 mechanism for recycling homogeneous item pools efficiently.
          // keyExtractor provides stable identity so recycler doesn't remount rows.
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return <DateHeader date={item.date} />;
            }
            return <TransactionRow tx={item.tx} locale={locale} />;
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Sprint E3: parity with the transaction-row inset (badge starts ~24pt in
    // after padding+columnGap). Header was the lone screen element breaking
    // the gutter — flush-left title vs right-hugging search icon read as
    // misaligned against rows below.
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    ...TYPE.displayM,
    color: COLORS.textPrimary,
  },
  searchButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  searchIcon: {
    ...TYPE.displayM,
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    ...TYPE.uiBody,
    color: COLORS.textMuted,
  },
  errorBanner: {
    backgroundColor: COLORS.errorSubtle,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  errorText: {
    ...TYPE.uiLabel,
    color: COLORS.error,
  },
});
