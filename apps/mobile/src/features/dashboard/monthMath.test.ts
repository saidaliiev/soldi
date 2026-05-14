/**
 * Unit tests for monthMath — pure month arithmetic used by MonthSwiper.
 *
 * Pattern: node:test + tsx (01-LEARNINGS Pattern 11).
 * Run via: npx tsx --test src/features/dashboard/monthMath.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { addMonths, clampMonth, isFutureMonth, formatMonthLabel, compareMonth } from './monthMath.js';

// ---------------------------------------------------------------------------
// addMonths
// ---------------------------------------------------------------------------

test('addMonths: Dec 2026 + 1 → Jan 2027', () => {
  assert.deepStrictEqual(addMonths({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
});

test('addMonths: Jan 2026 − 1 → Dec 2025', () => {
  assert.deepStrictEqual(addMonths({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
});

test('addMonths: May 2026 + 0 → May 2026', () => {
  assert.deepStrictEqual(addMonths({ year: 2026, month: 5 }, 0), { year: 2026, month: 5 });
});

test('addMonths: Jan 2026 + 24 → Jan 2028', () => {
  assert.deepStrictEqual(addMonths({ year: 2026, month: 1 }, 24), { year: 2028, month: 1 });
});

test('addMonths: Mar 2026 − 14 → Jan 2025', () => {
  assert.deepStrictEqual(addMonths({ year: 2026, month: 3 }, -14), { year: 2025, month: 1 });
});

// ---------------------------------------------------------------------------
// compareMonth
// ---------------------------------------------------------------------------

test('compareMonth: a < b → negative', () => {
  assert.ok(compareMonth({ year: 2025, month: 12 }, { year: 2026, month: 1 }) < 0);
});

test('compareMonth: a > b → positive', () => {
  assert.ok(compareMonth({ year: 2026, month: 2 }, { year: 2026, month: 1 }) > 0);
});

test('compareMonth: a == b → 0', () => {
  assert.strictEqual(compareMonth({ year: 2026, month: 5 }, { year: 2026, month: 5 }), 0);
});

// ---------------------------------------------------------------------------
// clampMonth
// ---------------------------------------------------------------------------

test('clampMonth: target before earliest → returns earliest', () => {
  const earliest = { year: 2025, month: 6 };
  const latestPlusOne = { year: 2026, month: 7 };
  const target = { year: 2025, month: 1 };
  assert.deepStrictEqual(clampMonth(target, earliest, latestPlusOne), earliest);
});

test('clampMonth: target after latestPlusOne → returns latestPlusOne', () => {
  const earliest = { year: 2025, month: 6 };
  const latestPlusOne = { year: 2026, month: 7 };
  const target = { year: 2027, month: 1 };
  assert.deepStrictEqual(clampMonth(target, earliest, latestPlusOne), latestPlusOne);
});

test('clampMonth: in-range target returns unchanged', () => {
  const earliest = { year: 2025, month: 6 };
  const latestPlusOne = { year: 2026, month: 7 };
  const target = { year: 2026, month: 1 };
  assert.deepStrictEqual(clampMonth(target, earliest, latestPlusOne), target);
});

// ---------------------------------------------------------------------------
// isFutureMonth
// ---------------------------------------------------------------------------

test('isFutureMonth: Jan 2027 vs 2026-05-14 → true', () => {
  const today = new Date(Date.UTC(2026, 4, 14)); // May 14, 2026 (month is 0-based here)
  assert.strictEqual(isFutureMonth({ year: 2027, month: 1 }, today), true);
});

test('isFutureMonth: May 2026 vs 2026-05-14 (same month) → false', () => {
  const today = new Date(Date.UTC(2026, 4, 14));
  assert.strictEqual(isFutureMonth({ year: 2026, month: 5 }, today), false);
});

test('isFutureMonth: Apr 2026 vs 2026-05-14 → false', () => {
  const today = new Date(Date.UTC(2026, 4, 14));
  assert.strictEqual(isFutureMonth({ year: 2026, month: 4 }, today), false);
});

test('isFutureMonth: Jun 2026 vs 2026-05-14 → true', () => {
  const today = new Date(Date.UTC(2026, 4, 14));
  assert.strictEqual(isFutureMonth({ year: 2026, month: 6 }, today), true);
});

// ---------------------------------------------------------------------------
// formatMonthLabel
// ---------------------------------------------------------------------------

test('formatMonthLabel: en-US, May 2026 → "May 2026"', () => {
  const label = formatMonthLabel({ year: 2026, month: 5 }, 'en-US');
  assert.strictEqual(label, 'May 2026');
});

test('formatMonthLabel: returns non-empty string', () => {
  const label = formatMonthLabel({ year: 2026, month: 12 }, 'en-IE');
  assert.ok(label.length > 0);
});
