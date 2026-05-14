/**
 * SOLDI dashboard — pure digest math.
 *
 * Drives the "yesterday in money" DigestCard:
 *   - computeYesterdayExpenseCents(today, dailyTotals) — value for the hero number
 *   - buildLast7DaysSeries(today, dailyTotals)         — 7-entry sparkline series
 *   - computeMonthOverMonthDelta(curr, prev, ...)      — daily-avg compare
 *   - selectDigestPhraseKey(mode)                      — i18n key for MoM phrase
 *
 * All date arithmetic happens in UTC (per Phase 1 LEARNING: avoid DST drift
 * when joining `Date` instances with ISO `YYYY-MM-DD` strings produced by
 * `strftime('%Y-%m-%d', occurred_at)` on the SQLite side).
 *
 * Pure module — no React, no DB imports, node:test-friendly.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DailyExpense = {
  readonly date: string; // YYYY-MM-DD
  readonly cents: number; // positive absolute cents
};

export type MoMMode = 'above' | 'below' | 'equal' | 'no_prior';

export type MoMResult = {
  readonly deltaCents: number;
  readonly mode: MoMMode;
};

export type DigestPhraseKey =
  | 'dashboard.digest_above_avg'
  | 'dashboard.digest_below_avg'
  | 'dashboard.digest_on_track'
  | 'dashboard.digest_first_month';

// ---------------------------------------------------------------------------
// Internal — date helpers (all UTC)
// ---------------------------------------------------------------------------

/** Returns the calendar date `d` shifted by `days` days (UTC, no DST drift). */
function addDaysUTC(d: Date, days: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
}

/** Format `d` as YYYY-MM-DD using UTC components. */
function toISODate(d: Date): string {
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// computeYesterdayExpenseCents
// ---------------------------------------------------------------------------

/**
 * Returns the expense total (positive cents) for the day immediately before
 * `today`. Looks up the matching row in `dailyTotals`; returns 0 if absent.
 *
 * Caller (useDigestData) passes `today = new Date()`. The yesterday key is
 * derived in UTC so it matches the SQL `strftime('%Y-%m-%d', occurred_at)`
 * output (which is also UTC-based for unix-second timestamps).
 */
export function computeYesterdayExpenseCents(
  today: Date,
  dailyTotals: readonly DailyExpense[]
): number {
  const yesterday = addDaysUTC(today, -1);
  const key = toISODate(yesterday);
  for (const row of dailyTotals) {
    if (row.date === key) return Math.max(0, Math.floor(row.cents));
  }
  return 0;
}

// ---------------------------------------------------------------------------
// buildLast7DaysSeries
// ---------------------------------------------------------------------------

/**
 * Returns the last 7 daily expense totals, oldest first.
 *
 * Window: [yesterday-6 .. yesterday] inclusive (7 entries). Today is NOT
 * included — the digest card surfaces "yesterday in money", and an in-flight
 * "today" total would skew the sparkline late in the day.
 *
 * Missing days produce 0 entries (sparse SQL results are densified here).
 * Rows outside the window are ignored.
 */
export function buildLast7DaysSeries(
  today: Date,
  dailyTotals: readonly DailyExpense[]
): readonly number[] {
  const lookup = new Map<string, number>();
  for (const row of dailyTotals) {
    lookup.set(row.date, Math.max(0, Math.floor(row.cents)));
  }
  const out: number[] = [];
  for (let i = 7; i >= 1; i--) {
    const key = toISODate(addDaysUTC(today, -i));
    out.push(lookup.get(key) ?? 0);
  }
  return out;
}

// ---------------------------------------------------------------------------
// computeMonthOverMonthDelta
// ---------------------------------------------------------------------------

/** Cents tolerance below which the daily-avg compare is considered "on track". */
const EQUAL_TOLERANCE_CENTS = 100; // €1.00

/**
 * Compares the current month's daily-average spend to the previous month's,
 * returning a signed cents delta and a categorical mode for phrase selection.
 *
 * Edge cases (locked):
 *   - prev <= 0 → mode = 'no_prior' (first-month-tracked phrase).
 *   - daysElapsedInCurrent === 0:
 *       - if both totals are zero → 'equal' (nothing to say either way)
 *       - else → 'no_prior' (can't divide by zero for current avg)
 *   - |delta| <= EQUAL_TOLERANCE_CENTS → 'equal' (avoids twitchy phrase changes).
 *
 * Sign convention: deltaCents > 0 means current daily-avg > prior daily-avg.
 */
export function computeMonthOverMonthDelta(
  currentMonthTotalCents: number,
  prevMonthTotalCents: number,
  daysElapsedInCurrent: number,
  daysInPrev: number
): MoMResult {
  // No prior data → first month tracked.
  if (prevMonthTotalCents <= 0 || daysInPrev <= 0) {
    if (currentMonthTotalCents === 0 && daysElapsedInCurrent === 0) {
      return { deltaCents: 0, mode: 'equal' };
    }
    return { deltaCents: 0, mode: 'no_prior' };
  }

  if (daysElapsedInCurrent <= 0) {
    // Locked: with prior data present we can't compute current daily avg → no_prior.
    // (The both-zero-no-elapsed case is already handled by the prev<=0 branch above.)
    return { deltaCents: 0, mode: 'no_prior' };
  }

  const currentDailyAvg = currentMonthTotalCents / daysElapsedInCurrent;
  const prevDailyAvg = prevMonthTotalCents / daysInPrev;
  const deltaFloat = currentDailyAvg - prevDailyAvg;
  const deltaCents = Math.trunc(deltaFloat);

  if (Math.abs(deltaFloat) <= EQUAL_TOLERANCE_CENTS) {
    return { deltaCents, mode: 'equal' };
  }
  return {
    deltaCents,
    mode: deltaFloat > 0 ? 'above' : 'below',
  };
}

// ---------------------------------------------------------------------------
// selectDigestPhraseKey
// ---------------------------------------------------------------------------

/**
 * Maps a MoM mode to the matching i18n key string. Pure switch — no fallback
 * branch (exhaustive over the union type so TS narrows correctly).
 */
export function selectDigestPhraseKey(mode: MoMMode): DigestPhraseKey {
  switch (mode) {
    case 'above':
      return 'dashboard.digest_above_avg';
    case 'below':
      return 'dashboard.digest_below_avg';
    case 'equal':
      return 'dashboard.digest_on_track';
    case 'no_prior':
      return 'dashboard.digest_first_month';
  }
}
