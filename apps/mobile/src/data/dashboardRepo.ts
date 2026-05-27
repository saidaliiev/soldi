/**
 * SOLDI dashboard repository (Phase 2 — Wave 1 + Wave 2).
 *
 * Queries consumed by the dashboard screen:
 *   - getMonthlyExpenseTotal(year, month) → positive cents
 *   - getCategoryBreakdown(year, month)   → top 5 + Other slice
 *   - getMonthsWithTransactions()         → distinct {year,month} tuples ASC
 *   - getDailyExpenseTotals(fromISO, toISO) → per-day positive cents (02-02)
 *
 * Conventions (locked, 01-SKELETON):
 *   negative amount_cents = expense, positive = income.
 *   transactions.date is stored as INTEGER unix seconds (UTC).
 *
 * Security (T-02-01-01 mitigation):
 *   All queries use parameterized `?` placeholders. Year/month are coerced
 *   to integer + bounded (1900..3000, 1..12) before query.
 *
 * Performance (T-02-01-02 mitigation):
 *   - All SELECTs are bounded by month (idx_transactions_date covers them).
 *   - Never SELECT *.
 *   - executeSync — synchronous, no Promise chain bloat.
 */

import { getDB } from '@lib/db';
import { COLORS } from '@design/tokens';
import {
  colorForCategorySlug,
  slugForCategoryName,
} from '@data/categoriesRepo';
import { DEFAULT_CATEGORY_EMOJI, emojiForSlug } from '@data/categoryEmojis';
import { monthStartEndUnixSec } from '../features/dashboard/monthMath';
import type {
  CategoryBreakdown,
  CategorySlice,
  MonthKey,
} from '../features/dashboard/types';

// ---------------------------------------------------------------------------
// Internal — year/month bounds check
// ---------------------------------------------------------------------------

function boundsOrNull(year: number, month: number): { startSec: number; endSec: number } | null {
  const yi = Math.floor(Number(year));
  const mi = Math.floor(Number(month));
  if (!Number.isFinite(yi) || !Number.isFinite(mi)) return null;
  if (yi < 1900 || yi > 3000) return null;
  if (mi < 1 || mi > 12) return null;
  return monthStartEndUnixSec({ year: yi, month: mi });
}

// ---------------------------------------------------------------------------
// getMonthlyExpenseTotal
// ---------------------------------------------------------------------------

/**
 * Returns the sum of expense (negative amount_cents) transactions in the
 * given calendar month, expressed as a POSITIVE cents integer.
 *
 * Returns 0 for empty months and for invalid inputs (e.g. month=13).
 */
export function getMonthlyExpenseTotal(year: number, month: number): number {
  const b = boundsOrNull(year, month);
  if (b == null) return 0;

  const db = getDB();
  const result = db.executeSync(
    `SELECT COALESCE(-SUM(amount_cents), 0) AS total
     FROM transactions
     WHERE amount_cents < 0
       AND date >= ? AND date < ?`,
    [b.startSec, b.endSec]
  );
  const row = result.rows[0];
  if (row == null) return 0;
  const total = (row['total'] as number) ?? 0;
  return Math.max(0, total);
}

// ---------------------------------------------------------------------------
// getCategoryBreakdown
// ---------------------------------------------------------------------------

/**
 * Returns the top-5 categories (descending by absolute expense) + one
 * aggregated "Other" slice for the remainder.
 *
 * Percentages sum to 1.0 (± rounding). totalExpenseCents matches
 * getMonthlyExpenseTotal(year, month) by construction.
 *
 * For months with zero expense: returns top=[], other=null, totalExpenseCents=0.
 * For 5-or-fewer distinct categories: other is null.
 */
export function getCategoryBreakdown(year: number, month: number): CategoryBreakdown {
  const empty: CategoryBreakdown = { top: [], other: null, totalExpenseCents: 0 };
  const b = boundsOrNull(year, month);
  if (b == null) return empty;

  const db = getDB();
  // Uncategorized transactions (category_id IS NULL) are bucketed into the
  // seeded misc category instead of forming a phantom "Other" group key.
  // Without the COALESCE coercion, NULL rows and the seeded misc row both
  // render as "Other" (different totals, same display name) — the dashboard
  // breakdown then shows two separate "Other" rows.
  const result = db.executeSync(
    `SELECT COALESCE(t.category_id, (SELECT id FROM categories WHERE slug='misc')) AS category_id,
            COALESCE(c.name_en, 'Other') AS name_en,
            COALESCE(c.name_uk, c.name_en, 'Other') AS name_uk,
            c.slug                       AS slug,
            c.emoji                      AS emoji,
            COALESCE(-SUM(t.amount_cents), 0) AS abs_total
     FROM transactions t
     LEFT JOIN categories c ON c.id = COALESCE(t.category_id, (SELECT id FROM categories WHERE slug='misc'))
     WHERE t.amount_cents < 0
       AND t.date >= ? AND t.date < ?
     GROUP BY COALESCE(t.category_id, (SELECT id FROM categories WHERE slug='misc')),
              c.name_en, c.name_uk, c.slug, c.emoji
     ORDER BY abs_total DESC`,
    [b.startSec, b.endSec]
  );

  if (result.rows.length === 0) return empty;

  type Agg = {
    categoryId: number;
    nameEn: string;
    nameUk: string;
    storedSlug: string | null;
    storedEmoji: string | null;
    absTotal: number;
  };
  const aggs: Agg[] = result.rows.map((row) => ({
    categoryId: (row['category_id'] as number | null) ?? -1,
    nameEn: ((row['name_en'] as string | null) ?? 'Other'),
    nameUk: ((row['name_uk'] as string | null) ?? 'Other'),
    storedSlug: (row['slug'] as string | null) ?? null,
    storedEmoji: (row['emoji'] as string | null) ?? null,
    absTotal: Math.max(0, (row['abs_total'] as number) ?? 0),
  }));

  const total = aggs.reduce((acc, a) => acc + a.absTotal, 0);
  if (total <= 0) return empty;

  const TOP_N = 5;
  const topAggs = aggs.slice(0, TOP_N);
  const remainder = aggs.slice(TOP_N);

  const top: CategorySlice[] = topAggs.map((a) => {
    // Prefer the DB-stored slug (categories.slug, migration-002 backfilled).
    // Falls back to a name-derived slug so the colour palette still matches
    // when the JOIN row pre-dates 002.
    const slug =
      a.storedSlug != null && a.storedSlug.length > 0
        ? a.storedSlug
        : slugForCategoryName(a.nameEn);
    // Same precedence for emoji: DB column > slug → emoji map > misc pin.
    const emoji =
      a.storedEmoji != null && a.storedEmoji.length > 0
        ? a.storedEmoji
        : emojiForSlug(slug);
    return {
      categoryId: a.categoryId,
      slug,
      nameEn: a.nameEn,
      nameUk: a.nameUk,
      color: colorForCategorySlug(slug),
      emoji,
      amountCents: a.absTotal,
      percentage: a.absTotal / total,
    };
  });

  let other: CategorySlice | null = null;
  if (remainder.length > 0) {
    const sumOther = remainder.reduce((acc, a) => acc + a.absTotal, 0);
    if (sumOther > 0) {
      other = {
        categoryId: -1,
        slug: 'other',
        nameEn: 'Other',
        // Synthetic aggregate slice — mirrors the existing hardcoded English
        // 'Other' literal with the seeded Ukrainian for the misc bucket.
        nameUk: 'Інше',
        color: COLORS.textMuted,
        // Synthetic slice uses the canonical misc pin since it isn't a real
        // categories row (no JOIN target for emoji).
        emoji: DEFAULT_CATEGORY_EMOJI,
        amountCents: sumOther,
        percentage: sumOther / total,
      };
    }
  }

  return { top, other, totalExpenseCents: total };
}

// ---------------------------------------------------------------------------
// getMonthsWithTransactions
// ---------------------------------------------------------------------------

/**
 * Returns the distinct calendar months (year, month) for which any
 * transaction exists, ascending by year then month.
 *
 * Used by MonthSwiper to bound the past-lock — earliest month = result[0].
 *
 * Note: strftime() reads the `date` column as a *unix timestamp* via the
 * `unixepoch` modifier — the column is INTEGER unix seconds (not ISO text).
 */
export function getMonthsWithTransactions(): readonly MonthKey[] {
  const db = getDB();
  const result = db.executeSync(
    `SELECT DISTINCT
       CAST(strftime('%Y', date, 'unixepoch') AS INTEGER) AS y,
       CAST(strftime('%m', date, 'unixepoch') AS INTEGER) AS m
     FROM transactions
     ORDER BY y ASC, m ASC`
  );

  const out: MonthKey[] = [];
  for (const row of result.rows) {
    const y = row['y'] as number;
    const m = row['m'] as number;
    if (Number.isInteger(y) && Number.isInteger(m) && m >= 1 && m <= 12) {
      out.push({ year: y, month: m });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// getDailyExpenseTotals (02-02 — digest card sparkline)
// ---------------------------------------------------------------------------

/**
 * Returns daily expense totals (positive cents) for the half-open ISO date
 * window [dateFromISO, dateToISO). Used by useDigestData → buildLast7DaysSeries
 * (which fills missing days with zeros) and computeYesterdayExpenseCents.
 *
 * Bounds are inclusive of `dateFromISO` and exclusive of `dateToISO`. The
 * caller is responsible for computing the exclusive upper bound (e.g.
 * `today+1` to include today's row).
 *
 * Note: `transactions.date` is INTEGER unix seconds (per schema-001 and
 * 02-01-SUMMARY deviation §1). ISO date inputs are validated via Date
 * round-trip and converted to unix seconds before binding (T-02-02-01
 * mitigation — reject NaN dates).
 *
 * Rows for days with zero spend are omitted by SQL — densify in the caller.
 */
export function getDailyExpenseTotals(
  dateFromISO: string,
  dateToISO: string
): readonly { date: string; cents: number }[] {
  const from = new Date(dateFromISO);
  const to = new Date(dateToISO);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    // Tampered / malformed inputs — surface as empty, caller will fall back
    // to zero series. (T-02-02-01 mitigation — never bind NaN to SQL.)
    return [];
  }
  const fromSec = Math.floor(from.getTime() / 1000);
  const toSec = Math.floor(to.getTime() / 1000);
  if (toSec <= fromSec) return [];

  const db = getDB();
  const result = db.executeSync(
    `SELECT strftime('%Y-%m-%d', date, 'unixepoch') AS d,
            COALESCE(-SUM(amount_cents), 0) AS cents
     FROM transactions
     WHERE amount_cents < 0
       AND date >= ? AND date < ?
     GROUP BY d
     ORDER BY d ASC`,
    [fromSec, toSec]
  );

  const out: { date: string; cents: number }[] = [];
  for (const row of result.rows) {
    const d = row['d'] as string | null;
    const cents = (row['cents'] as number | null) ?? 0;
    if (typeof d === 'string' && d.length === 10) {
      out.push({ date: d, cents: Math.max(0, Math.floor(cents)) });
    }
  }
  return out;
}
