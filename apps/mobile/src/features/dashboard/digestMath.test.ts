/**
 * Unit tests for digestMath — yesterday total, 7-day series, MoM delta,
 * phrase template selection.
 *
 * Pattern: node:test + tsx (01-LEARNINGS Pattern 11).
 * Run via: npx tsx --test src/features/dashboard/digestMath.test.ts
 *
 * All `today` Dates are constructed via Date.UTC to keep tests timezone-agnostic.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeYesterdayExpenseCents,
  buildLast7DaysSeries,
  computeMonthOverMonthDelta,
  selectDigestPhraseKey,
} from './digestMath.js';

// ---------------------------------------------------------------------------
// computeYesterdayExpenseCents
// ---------------------------------------------------------------------------

test('computeYesterdayExpenseCents: yesterday has expense → positive cents', () => {
  const today = new Date(Date.UTC(2026, 4, 14)); // 2026-05-14
  const totals = [{ date: '2026-05-13', cents: 4200 }];
  assert.strictEqual(computeYesterdayExpenseCents(today, totals), 4200);
});

test('computeYesterdayExpenseCents: no row for yesterday → 0', () => {
  const today = new Date(Date.UTC(2026, 4, 14));
  const totals = [{ date: '2026-05-10', cents: 1000 }];
  assert.strictEqual(computeYesterdayExpenseCents(today, totals), 0);
});

test('computeYesterdayExpenseCents: empty totals → 0', () => {
  const today = new Date(Date.UTC(2026, 4, 14));
  assert.strictEqual(computeYesterdayExpenseCents(today, []), 0);
});

test('computeYesterdayExpenseCents: yesterday is first day of month → looks back across month boundary', () => {
  // Today is 2026-06-01 → yesterday is 2026-05-31.
  const today = new Date(Date.UTC(2026, 5, 1));
  const totals = [{ date: '2026-05-31', cents: 1234 }];
  assert.strictEqual(computeYesterdayExpenseCents(today, totals), 1234);
});

// ---------------------------------------------------------------------------
// buildLast7DaysSeries
// ---------------------------------------------------------------------------

test('buildLast7DaysSeries: today=2026-05-14, sparse totals → 7 entries oldest first', () => {
  // Window is yesterday-back-7: 2026-05-07 .. 2026-05-13 (7 entries, oldest first).
  const today = new Date(Date.UTC(2026, 4, 14));
  const totals = [
    { date: '2026-05-10', cents: 5000 },
    { date: '2026-05-13', cents: 8000 },
  ];
  const result = buildLast7DaysSeries(today, totals);
  assert.strictEqual(result.length, 7);
  // Index 0 = 2026-05-07, ... index 3 = 2026-05-10, index 6 = 2026-05-13.
  assert.deepStrictEqual(result, [0, 0, 0, 5000, 0, 0, 8000]);
});

test('buildLast7DaysSeries: all zero spend → flat array of 7 zeros', () => {
  const today = new Date(Date.UTC(2026, 4, 14));
  assert.deepStrictEqual(
    buildLast7DaysSeries(today, []),
    [0, 0, 0, 0, 0, 0, 0]
  );
});

test('buildLast7DaysSeries: window crosses month boundary', () => {
  // Today is 2026-06-03 → window is 2026-05-27 .. 2026-06-02 (7 entries).
  const today = new Date(Date.UTC(2026, 5, 3));
  const totals = [
    { date: '2026-05-31', cents: 100 },
    { date: '2026-06-01', cents: 200 },
  ];
  const result = buildLast7DaysSeries(today, totals);
  assert.strictEqual(result.length, 7);
  // Indices: 0=05-27, 1=05-28, 2=05-29, 3=05-30, 4=05-31, 5=06-01, 6=06-02.
  assert.deepStrictEqual(result, [0, 0, 0, 0, 100, 200, 0]);
});

test('buildLast7DaysSeries: ignores rows outside the 7-day window', () => {
  const today = new Date(Date.UTC(2026, 4, 14));
  const totals = [
    { date: '2026-05-06', cents: 999 }, // before window
    { date: '2026-05-14', cents: 999 }, // today (excluded — only yesterday-back)
    { date: '2026-05-13', cents: 1500 },
  ];
  const result = buildLast7DaysSeries(today, totals);
  assert.strictEqual(result.length, 7);
  assert.deepStrictEqual(result, [0, 0, 0, 0, 0, 0, 1500]);
});

// ---------------------------------------------------------------------------
// computeMonthOverMonthDelta
// ---------------------------------------------------------------------------

test('computeMonthOverMonthDelta: current daily-avg above prior → above', () => {
  // current = 20000 cents over 14 days → 1428.57 daily avg
  // prev    = 30000 cents over 30 days → 1000 daily avg
  // delta ≈ 428 → above.
  const result = computeMonthOverMonthDelta(20000, 30000, 14, 30);
  assert.strictEqual(result.mode, 'above');
  assert.ok(result.deltaCents >= 428 && result.deltaCents <= 429);
});

test('computeMonthOverMonthDelta: current daily-avg below prior → below', () => {
  // Swap: current 30000 over 30, prev 20000 over 14 (prev avg ≈ 1428.57)
  // current avg = 1000 → delta ≈ -428 → below.
  const result = computeMonthOverMonthDelta(30000, 20000, 30, 14);
  assert.strictEqual(result.mode, 'below');
});

test('computeMonthOverMonthDelta: equal daily-avg (within tolerance) → equal', () => {
  // current = 14000 / 14 = 1000, prev = 30000 / 30 = 1000 → equal.
  const result = computeMonthOverMonthDelta(14000, 30000, 14, 30);
  assert.strictEqual(result.mode, 'equal');
});

test('computeMonthOverMonthDelta: prev = 0 → no_prior', () => {
  const result = computeMonthOverMonthDelta(20000, 0, 14, 30);
  assert.strictEqual(result.mode, 'no_prior');
});

test('computeMonthOverMonthDelta: daysElapsedInCurrent = 0 with both zero → equal', () => {
  // Locked edge case: both totals zero AND no elapsed days → equal.
  const result = computeMonthOverMonthDelta(0, 0, 0, 30);
  assert.strictEqual(result.mode, 'equal');
});

test('computeMonthOverMonthDelta: daysElapsedInCurrent = 0 with prev > 0 → no_prior', () => {
  // Locked edge case: no elapsed days with prior data → no_prior (can't compare yet).
  const result = computeMonthOverMonthDelta(0, 30000, 0, 30);
  assert.strictEqual(result.mode, 'no_prior');
});

test('computeMonthOverMonthDelta: small (≤€1) difference → equal (tolerance)', () => {
  // current avg = 1000.5, prev avg = 1000.0 → ≤100c tolerance → equal.
  const result = computeMonthOverMonthDelta(14007, 30000, 14, 30);
  assert.strictEqual(result.mode, 'equal');
});

// ---------------------------------------------------------------------------
// selectDigestPhraseKey
// ---------------------------------------------------------------------------

test('selectDigestPhraseKey: above → dashboard.digest_above_avg', () => {
  assert.strictEqual(selectDigestPhraseKey('above'), 'dashboard.digest_above_avg');
});

test('selectDigestPhraseKey: below → dashboard.digest_below_avg', () => {
  assert.strictEqual(selectDigestPhraseKey('below'), 'dashboard.digest_below_avg');
});

test('selectDigestPhraseKey: equal → dashboard.digest_on_track', () => {
  assert.strictEqual(selectDigestPhraseKey('equal'), 'dashboard.digest_on_track');
});

test('selectDigestPhraseKey: no_prior → dashboard.digest_first_month', () => {
  assert.strictEqual(selectDigestPhraseKey('no_prior'), 'dashboard.digest_first_month');
});
