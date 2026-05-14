/**
 * useTransactionsList — subscribes to filterStore + reads listByFilter
 * synchronously, then groups via dateGrouping for FlashList consumption.
 *
 * Re-queries on:
 *   - tab focus  (useFocusEffect — Phase 1 pattern)
 *   - filter change (any FilterState axis mutation in the store)
 *   - explicit refresh() call (used after updateCategory / updateTransaction)
 *
 * Security: errors are surfaced as a boolean — never log SQL fragments or
 * transaction details (CLAUDE.md security rule + T-02-03-04).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { listByFilter } from '@data/transactionsRepo';
import { useFilterStore } from './filterStore';
import { groupByDate, computeStickyIndices } from './dateGrouping';
import type { FeedItem, Transaction } from './types';

type UseTransactionsListResult = {
  readonly transactions: readonly Transaction[];
  readonly feed: readonly FeedItem[];
  readonly stickyIndices: readonly number[];
  readonly isLoading: boolean;
  readonly error: boolean;
  readonly refresh: () => void;
};

export function useTransactionsList(): UseTransactionsListResult {
  const search = useFilterStore((s) => s.search);
  const categoryIds = useFilterStore((s) => s.categoryIds);
  const minCents = useFilterStore((s) => s.minCents);
  const maxCents = useFilterStore((s) => s.maxCents);
  const sign = useFilterStore((s) => s.sign);
  const dateFromISO = useFilterStore((s) => s.dateFromISO);
  const dateToISO = useFilterStore((s) => s.dateToISO);

  const [transactions, setTransactions] = useState<readonly Transaction[]>([]);
  const [error, setError] = useState<boolean>(false);
  const [tick, setTick] = useState<number>(0);

  const load = useCallback(() => {
    try {
      const rows = listByFilter({
        search,
        categoryIds,
        minCents,
        maxCents,
        sign,
        dateFromISO,
        dateToISO,
      });
      setTransactions(rows);
      setError(false);
    } catch {
      // Never expose error details (T-02-03-04 — no PII / SQL fragments).
      setTransactions([]);
      setError(true);
    }
  }, [search, categoryIds, minCents, maxCents, sign, dateFromISO, dateToISO]);

  // Reload on focus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Reload on filter mutation while screen is mounted.
  useEffect(() => {
    load();
  }, [load, tick]);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const feed = useMemo(() => groupByDate(transactions), [transactions]);
  const stickyIndices = useMemo(() => computeStickyIndices(feed), [feed]);

  return {
    transactions,
    feed,
    stickyIndices,
    isLoading: false,
    error,
    refresh,
  };
}
