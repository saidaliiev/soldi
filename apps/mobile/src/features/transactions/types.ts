/**
 * SOLDI Phase 2 plan 02-03 — transactions feature types.
 *
 * FilterState is the canonical shape consumed by:
 *   - filterStore (Zustand, persisted via secureStorage)
 *   - filterCompose.buildFilterSql (pure SQL composition)
 *   - useTransactionsList (hook that turns filter → feed)
 *   - SearchFilterModal (route component that mutates the store)
 *
 * Transaction is a normalized projection of the underlying transactions table
 * joined with categories — the row shape consumed by TransactionRow.
 *
 * FeedItem is the union FlashList renders: alternating headers and rows.
 *
 * Money sign convention (locked in 01-SKELETON): amount_cents negative=expense,
 * positive=income. ABS() is used throughout filterCompose for amount-range
 * predicates so the user enters magnitudes, not signed cents.
 */

// ---------------------------------------------------------------------------
// FilterState
// ---------------------------------------------------------------------------

export type FilterSign = 'expense' | 'income' | 'both';

export type FilterAxisKey =
  | 'search'
  | 'categories'
  | 'amount'
  | 'sign'
  | 'date';

export type FilterState = {
  /** Free-text search query — matched against merchant_name and amount only. */
  readonly search: string;
  readonly categoryIds: readonly number[];
  readonly minCents: number | null;
  readonly maxCents: number | null;
  readonly sign: FilterSign;
  readonly dateFromISO: string | null;
  readonly dateToISO: string | null;
};

export const EMPTY_FILTER: FilterState = {
  search: '',
  categoryIds: [],
  minCents: null,
  maxCents: null,
  sign: 'both',
  dateFromISO: null,
  dateToISO: null,
} as const;

// ---------------------------------------------------------------------------
// Transaction (projection joined with categories)
// ---------------------------------------------------------------------------

export type Transaction = {
  readonly id: number;
  readonly amountCents: number;
  readonly currency: string;
  readonly merchantName: string;
  readonly categoryId: number | null;
  readonly categoryName: string | null;
  readonly categoryIconSlug: string | null;
  readonly categoryColor: string | null;
  /** Unix seconds — same convention as transactions.date column. */
  readonly dateSec: number;
};

// ---------------------------------------------------------------------------
// FeedItem (FlashList data) + sticky indices
// ---------------------------------------------------------------------------

export type FeedHeader = {
  readonly kind: 'header';
  /** YYYY-MM-DD in UTC (matches groupByDate emit). */
  readonly date: string;
  /** Sum of |amount_cents| for negative (expense) rows on this date. */
  readonly subtotalCents: number;
};

export type FeedRow = {
  readonly kind: 'row';
  readonly tx: Transaction;
};

export type FeedItem = FeedHeader | FeedRow;
