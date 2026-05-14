/**
 * SOLDI dashboard — pure month arithmetic.
 *
 * Uses MonthKey = { year, month: 1..12 } throughout (no Date objects
 * inside the math) so the result is deterministic, timezone-agnostic,
 * and node:test-friendly.
 *
 * Consumed by:
 * - MonthSwiper.tsx — past/future lock via clampMonth, isFutureMonth.
 * - DashboardScreen — formatMonthLabel for the hero sub-label.
 */

import type { MonthKey } from './types';

// ---------------------------------------------------------------------------
// compareMonth
// ---------------------------------------------------------------------------

/**
 * Three-way compare. Negative if a < b, 0 if equal, positive if a > b.
 */
export function compareMonth(a: MonthKey, b: MonthKey): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

// ---------------------------------------------------------------------------
// addMonths
// ---------------------------------------------------------------------------

/**
 * Returns key + delta months. Handles year rollover in both directions.
 *
 * delta = 1 on December → January next year.
 * delta = −1 on January → December previous year.
 */
export function addMonths(key: MonthKey, delta: number): MonthKey {
  // Use zero-based month internally for the arithmetic to handle negative deltas
  // cleanly via Math.floor.
  const zeroBased = key.month - 1 + delta;
  const yearOffset = Math.floor(zeroBased / 12);
  const newMonth0 = ((zeroBased % 12) + 12) % 12;
  return {
    year: key.year + yearOffset,
    month: newMonth0 + 1,
  };
}

// ---------------------------------------------------------------------------
// clampMonth
// ---------------------------------------------------------------------------

/**
 * Clamps `target` to the inclusive range [earliest, latestPlusOne].
 *
 * Used by MonthSwiper for D-02 past-lock + future-lock semantics:
 *   earliest      = month of first transaction (past lock)
 *   latestPlusOne = today's month + 1 (future lock, inclusive — that month
 *                   exists in the swiper as a "no data yet" placeholder).
 */
export function clampMonth(target: MonthKey, earliest: MonthKey, latestPlusOne: MonthKey): MonthKey {
  if (compareMonth(target, earliest) < 0) return earliest;
  if (compareMonth(target, latestPlusOne) > 0) return latestPlusOne;
  return target;
}

// ---------------------------------------------------------------------------
// isFutureMonth
// ---------------------------------------------------------------------------

/**
 * True iff `key` is strictly after the current month of `today` (UTC).
 *
 * Today's month is NOT future. Next month IS future.
 */
export function isFutureMonth(key: MonthKey, today: Date): boolean {
  const todayKey: MonthKey = {
    year: today.getUTCFullYear(),
    month: today.getUTCMonth() + 1, // 0-based → 1-based
  };
  return compareMonth(key, todayKey) > 0;
}

// ---------------------------------------------------------------------------
// formatMonthLabel
// ---------------------------------------------------------------------------

/**
 * Locale-aware "Month Year" label, e.g. "May 2026" / "Травень 2026".
 *
 * Uses Intl.DateTimeFormat with `{ month: 'long', year: 'numeric' }`.
 */
export function formatMonthLabel(key: MonthKey, locale: string): string {
  // Day=1 to avoid month rollover; UTC so the result depends only on inputs.
  const date = new Date(Date.UTC(key.year, key.month - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

// ---------------------------------------------------------------------------
// monthStartEndUnixSec — repo helper
// ---------------------------------------------------------------------------

/**
 * Returns the unix-second bounds for a calendar month in UTC.
 *
 *   startSec is inclusive (00:00:00 on day 1 of `key`).
 *   endSec   is exclusive (00:00:00 on day 1 of the next month).
 *
 * Used by dashboardRepo and transactionsRepo for `WHERE date >= ? AND date < ?`
 * queries against the unix-second `transactions.date` column.
 */
export function monthStartEndUnixSec(key: MonthKey): { startSec: number; endSec: number } {
  const start = Date.UTC(key.year, key.month - 1, 1);
  const next = addMonths(key, 1);
  const end = Date.UTC(next.year, next.month - 1, 1);
  return {
    startSec: Math.floor(start / 1000),
    endSec: Math.floor(end / 1000),
  };
}
