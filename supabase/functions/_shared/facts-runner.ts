/**
 * facts-runner.ts — closed registry of deterministic JS reducers over FactsPack.
 *
 * Architecture (D-17′, D-18′, D-19′):
 * Transactions live in local op-sqlite; the mobile client builds a FactsPack
 * (aggregate-only dataset) and ships it with every chat request. This module
 * is the ONLY data access layer in the ai-query Edge Function — it has NO
 * Postgres queries, NO remote DB calls. It runs pure JS reducers over the
 * in-request FactsPack.
 *
 * Security (T-03-03-02): No free-form SQL. Sonnet can only call the closed
 * enum of query_type values. zod ToolInput.strict() rejects unknown fields.
 *
 * Each QUERY_SHAPES function:
 * - Takes a FactsPack + filters
 * - Returns a QueryResult
 * - Never logs or re-transmits the FactsPack contents
 */

import type { FactsPackType, ToolInputType, QueryResultType, QueryTypeType } from './chat-schemas.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp date range to at most 13 months back from date_to (D-20′ server-side). */
export function clampDateRange(
  dateFrom: string,
  dateTo: string,
): { date_from: string; date_to: string; clamped: boolean } {
  const toDate = new Date(dateTo);
  const minFrom = new Date(toDate);
  minFrom.setMonth(minFrom.getMonth() - 13);
  const fromDate = new Date(dateFrom);

  if (fromDate < minFrom) {
    return {
      date_from: minFrom.toISOString().slice(0, 10),
      date_to: dateTo,
      clamped: true,
    };
  }
  return { date_from: dateFrom, date_to: dateTo, clamped: false };
}

/** Returns true if a YYYY-MM month string falls within [dateFrom, dateTo] (inclusive). */
function monthInRange(month: string, dateFrom: string, dateTo: string): boolean {
  // month = 'YYYY-MM', dateFrom/dateTo = 'YYYY-MM-DD'
  const monthStart = `${month}-01`;
  // month end = first day of next month, so we compare month <= dateTo month
  return monthStart >= dateFrom.slice(0, 7) + '-01' && monthStart <= dateTo;
}

/** Filters category slugs if specified; returns true if slug matches filter. */
function slugMatches(slug: string, categorySlugs: string[] | undefined): boolean {
  if (!categorySlugs || categorySlugs.length === 0) return true;
  return categorySlugs.includes(slug);
}

// ---------------------------------------------------------------------------
// Type for query functions
// ---------------------------------------------------------------------------

export type QueryFn = (
  factsPack: FactsPackType,
  filters: ToolInputType['filters'],
) => QueryResultType;

// ---------------------------------------------------------------------------
// QUERY_SHAPES — the closed registry
// ---------------------------------------------------------------------------

export const QUERY_SHAPES: Record<QueryTypeType, QueryFn> = {
  /**
   * Sum of expenses per category_slug within the date range.
   * Negative sum_cents = expense; we return abs value for UX clarity.
   */
  sum_by_category: (factsPack, filters): QueryResultType => {
    const { date_from, date_to, clamped } = clampDateRange(filters.date_from, filters.date_to);
    const accumulator: Record<string, number> = {};

    for (const entry of factsPack.monthly_category_sums) {
      if (!monthInRange(entry.month, date_from, date_to)) continue;
      if (!slugMatches(entry.category_slug, filters.category_slugs)) continue;
      const slug = entry.category_slug;
      accumulator[slug] = (accumulator[slug] ?? 0) + entry.sum_cents;
    }

    const rows = Object.entries(accumulator)
      .map(([category_slug, sum_cents]) => ({ category_slug, sum_cents: Math.abs(sum_cents) }))
      .sort((a, b) => (b.sum_cents as number) - (a.sum_cents as number))
      .slice(0, 50);

    return {
      query_type: 'sum_by_category',
      filters_applied: { date_from, date_to, ...filters },
      rows,
      clamped_date_range: clamped,
    };
  },

  /**
   * Count of transactions per category_slug within the date range.
   * Uses top_merchants_by_month as count source (each entry has a `count` field).
   */
  count_by_category: (factsPack, filters): QueryResultType => {
    const { date_from, date_to, clamped } = clampDateRange(filters.date_from, filters.date_to);
    const accumulator: Record<string, number> = {};

    for (const entry of factsPack.top_merchants_by_month) {
      if (!monthInRange(entry.month, date_from, date_to)) continue;
      if (!slugMatches(entry.category_slug, filters.category_slugs)) continue;
      const slug = entry.category_slug;
      accumulator[slug] = (accumulator[slug] ?? 0) + entry.count;
    }

    const rows = Object.entries(accumulator)
      .map(([category_slug, transaction_count]) => ({ category_slug, transaction_count }))
      .sort((a, b) => (b.transaction_count as number) - (a.transaction_count as number))
      .slice(0, 50);

    return {
      query_type: 'count_by_category',
      filters_applied: { date_from, date_to, ...filters },
      rows,
      clamped_date_range: clamped,
    };
  },

  /**
   * Total spending per month within the date range.
   * Returns month + sum_cents (absolute value of expense totals).
   */
  sum_by_month: (factsPack, filters): QueryResultType => {
    const { date_from, date_to, clamped } = clampDateRange(filters.date_from, filters.date_to);
    const accumulator: Record<string, number> = {};

    for (const entry of factsPack.monthly_category_sums) {
      if (!monthInRange(entry.month, date_from, date_to)) continue;
      if (!slugMatches(entry.category_slug, filters.category_slugs)) continue;
      const month = entry.month;
      accumulator[month] = (accumulator[month] ?? 0) + entry.sum_cents;
    }

    const rows = Object.entries(accumulator)
      .map(([month, sum_cents]) => ({ month, sum_cents: Math.abs(sum_cents) }))
      .sort((a, b) => (a.month as string).localeCompare(b.month as string))
      .slice(0, 50);

    return {
      query_type: 'sum_by_month',
      filters_applied: { date_from, date_to, ...filters },
      rows,
      clamped_date_range: clamped,
    };
  },

  /**
   * Top merchants by total spend within the date range.
   * Returns merchant_key (normalized — not raw name) + total_cents + count + category_slug.
   * Capped at 20 entries.
   *
   * Privacy note: merchant_key is normalized (lowercase, diacritics stripped),
   * not a display name. The system prompt instructs Sonnet not to reference
   * merchant_key values in prose.
   */
  top_merchants: (factsPack, filters): QueryResultType => {
    const { date_from, date_to, clamped } = clampDateRange(filters.date_from, filters.date_to);
    const accumulator: Record<string, { total_cents: number; count: number; category_slug: string }> = {};

    for (const entry of factsPack.top_merchants_by_month) {
      if (!monthInRange(entry.month, date_from, date_to)) continue;
      if (!slugMatches(entry.category_slug, filters.category_slugs)) continue;
      const key = entry.merchant_key;
      if (!accumulator[key]) {
        accumulator[key] = { total_cents: 0, count: 0, category_slug: entry.category_slug };
      }
      accumulator[key]!.total_cents += entry.total_cents;
      accumulator[key]!.count += entry.count;
    }

    const rows = Object.entries(accumulator)
      .map(([merchant_key, v]) => ({
        merchant_key,
        total_cents: Math.abs(v.total_cents),
        count: v.count,
        category_slug: v.category_slug,
      }))
      .sort((a, b) => (b.total_cents as number) - (a.total_cents as number))
      .slice(0, 20);

    return {
      query_type: 'top_merchants',
      filters_applied: { date_from, date_to, ...filters },
      rows,
      clamped_date_range: clamped,
    };
  },

  /**
   * Compare two periods — returns two scalar sums (period_a and period_b).
   * Requires filters.compare_from + filters.compare_to for the second window.
   * Period A = [date_from, date_to]; Period B = [compare_from, compare_to].
   */
  compare_periods: (factsPack, filters): QueryResultType => {
    const { date_from, date_to, clamped: clampedA } = clampDateRange(filters.date_from, filters.date_to);

    let sumA = 0;
    let sumB = 0;
    let clampedB = false;

    for (const entry of factsPack.monthly_category_sums) {
      if (!slugMatches(entry.category_slug, filters.category_slugs)) continue;
      if (monthInRange(entry.month, date_from, date_to)) {
        sumA += entry.sum_cents;
      }
    }

    if (filters.compare_from && filters.compare_to) {
      const { date_from: cfrom, date_to: cto, clamped: cc } = clampDateRange(
        filters.compare_from,
        filters.compare_to,
      );
      clampedB = cc;
      for (const entry of factsPack.monthly_category_sums) {
        if (!slugMatches(entry.category_slug, filters.category_slugs)) continue;
        if (monthInRange(entry.month, cfrom, cto)) {
          sumB += entry.sum_cents;
        }
      }
    }

    const rows = [
      {
        period: 'a',
        date_from,
        date_to,
        sum_cents: Math.abs(sumA),
      },
      {
        period: 'b',
        date_from: filters.compare_from ?? null,
        date_to: filters.compare_to ?? null,
        sum_cents: Math.abs(sumB),
      },
    ];

    return {
      query_type: 'compare_periods',
      filters_applied: { date_from, date_to, ...filters },
      rows,
      clamped_date_range: clampedA || clampedB,
    };
  },

  /**
   * Aggregate of the most recent N transactions' category distribution.
   * Returns counts + sums per category — never row-level data (CHAT-04).
   * "N" is inferred from the date range size (last N months' worth of data).
   */
  last_n_transactions_aggregate: (factsPack, filters): QueryResultType => {
    const { date_from, date_to, clamped } = clampDateRange(filters.date_from, filters.date_to);
    // Reuse sum_by_category logic for the requested range
    const accumulator: Record<string, { sum_cents: number; count: number }> = {};

    for (const entry of factsPack.monthly_category_sums) {
      if (!monthInRange(entry.month, date_from, date_to)) continue;
      if (!slugMatches(entry.category_slug, filters.category_slugs)) continue;
      const slug = entry.category_slug;
      if (!accumulator[slug]) accumulator[slug] = { sum_cents: 0, count: 0 };
      accumulator[slug]!.sum_cents += entry.sum_cents;
    }

    // Add counts from top_merchants_by_month
    for (const entry of factsPack.top_merchants_by_month) {
      if (!monthInRange(entry.month, date_from, date_to)) continue;
      if (!slugMatches(entry.category_slug, filters.category_slugs)) continue;
      const slug = entry.category_slug;
      if (!accumulator[slug]) accumulator[slug] = { sum_cents: 0, count: 0 };
      accumulator[slug]!.count += entry.count;
    }

    const rows = Object.entries(accumulator)
      .map(([category_slug, v]) => ({
        category_slug,
        sum_cents: Math.abs(v.sum_cents),
        transaction_count: v.count,
      }))
      .sort((a, b) => (b.sum_cents as number) - (a.sum_cents as number))
      .slice(0, 50);

    return {
      query_type: 'last_n_transactions_aggregate',
      filters_applied: { date_from, date_to, ...filters },
      rows,
      clamped_date_range: clamped,
    };
  },
};
