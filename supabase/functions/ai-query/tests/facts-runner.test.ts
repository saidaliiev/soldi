/**
 * facts-runner.test.ts — pure-function tests for QUERY_SHAPES reducers.
 *
 * No DB calls, no network calls — all tests run against a local FactsPack
 * fixture. Deno test runner.
 */

import { assertEquals, assert } from 'https://deno.land/std@0.220.0/assert/mod.ts';
import { QUERY_SHAPES, clampDateRange } from '../../_shared/facts-runner.ts';
import type { FactsPackType } from '../../_shared/chat-schemas.ts';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const FIXTURE_FACTS_PACK: FactsPackType = {
  currency: 'EUR',
  date_from: '2026-01-01',
  date_to: '2026-04-30',
  monthly_category_sums: [
    // April
    { month: '2026-04', category_slug: 'groceries', sum_cents: -24750 },
    { month: '2026-04', category_slug: 'dining', sum_cents: -8500 },
    { month: '2026-04', category_slug: 'transport', sum_cents: -3200 },
    // March
    { month: '2026-03', category_slug: 'groceries', sum_cents: -21000 },
    { month: '2026-03', category_slug: 'dining', sum_cents: -7000 },
    // February
    { month: '2026-02', category_slug: 'groceries', sum_cents: -18000 },
    // January
    { month: '2026-01', category_slug: 'groceries', sum_cents: -20000 },
  ],
  top_merchants_by_month: [
    {
      month: '2026-04',
      merchant_key: 'tesco express',
      category_slug: 'groceries',
      total_cents: -12000,
      count: 8,
    },
    {
      month: '2026-04',
      merchant_key: 'lidl',
      category_slug: 'groceries',
      total_cents: -8000,
      count: 5,
    },
    {
      month: '2026-04',
      merchant_key: 'just eat',
      category_slug: 'dining',
      total_cents: -4500,
      count: 3,
    },
    {
      month: '2026-03',
      merchant_key: 'tesco express',
      category_slug: 'groceries',
      total_cents: -11000,
      count: 7,
    },
  ],
};

// ---------------------------------------------------------------------------
// clampDateRange
// ---------------------------------------------------------------------------

Deno.test('clampDateRange — no clamp when range is <= 13 months', () => {
  const result = clampDateRange('2025-03-01', '2026-04-30');
  assertEquals(result.clamped, false);
  assertEquals(result.date_from, '2025-03-01');
});

Deno.test('clampDateRange — clamps when range exceeds 13 months', () => {
  const result = clampDateRange('2024-01-01', '2026-04-30');
  assertEquals(result.clamped, true);
  // 13 months back from 2026-04-30 → 2025-03-30
  assert(result.date_from > '2025-03-01');
});

// ---------------------------------------------------------------------------
// sum_by_category
// ---------------------------------------------------------------------------

Deno.test('sum_by_category — sums groceries over April', () => {
  const result = QUERY_SHAPES.sum_by_category(FIXTURE_FACTS_PACK, {
    date_from: '2026-04-01',
    date_to: '2026-04-30',
    category_slugs: ['groceries'],
  });
  assertEquals(result.query_type, 'sum_by_category');
  assertEquals(result.rows.length, 1);
  assertEquals(result.rows[0]!['category_slug'], 'groceries');
  assertEquals(result.rows[0]!['sum_cents'], 24750); // abs of -24750
});

Deno.test('sum_by_category — sums all categories over 2 months', () => {
  const result = QUERY_SHAPES.sum_by_category(FIXTURE_FACTS_PACK, {
    date_from: '2026-03-01',
    date_to: '2026-04-30',
  });
  // Should have groceries, dining, transport
  const slugs = result.rows.map((r) => r['category_slug']);
  assert(slugs.includes('groceries'));
  assert(slugs.includes('dining'));
  // Groceries = 24750 + 21000 = 45750 (abs)
  const groceries = result.rows.find((r) => r['category_slug'] === 'groceries');
  assertEquals(groceries!['sum_cents'], 45750);
});

// ---------------------------------------------------------------------------
// count_by_category
// ---------------------------------------------------------------------------

Deno.test('count_by_category — counts transactions by category in April', () => {
  const result = QUERY_SHAPES.count_by_category(FIXTURE_FACTS_PACK, {
    date_from: '2026-04-01',
    date_to: '2026-04-30',
  });
  assertEquals(result.query_type, 'count_by_category');
  const groceries = result.rows.find((r) => r['category_slug'] === 'groceries');
  // tesco(8) + lidl(5) = 13 in April
  assertEquals(groceries!['transaction_count'], 13);
});

// ---------------------------------------------------------------------------
// sum_by_month
// ---------------------------------------------------------------------------

Deno.test('sum_by_month — returns monthly totals in date order', () => {
  const result = QUERY_SHAPES.sum_by_month(FIXTURE_FACTS_PACK, {
    date_from: '2026-01-01',
    date_to: '2026-04-30',
  });
  assertEquals(result.query_type, 'sum_by_month');
  assertEquals(result.rows.length, 4);
  // Ordered by month asc
  assertEquals(result.rows[0]!['month'], '2026-01');
  assertEquals(result.rows[3]!['month'], '2026-04');
  // April = |24750 + 8500 + 3200| = 36450
  const april = result.rows.find((r) => r['month'] === '2026-04');
  assertEquals(april!['sum_cents'], 36450);
});

// ---------------------------------------------------------------------------
// top_merchants
// ---------------------------------------------------------------------------

Deno.test('top_merchants — returns top merchants sorted by spend desc', () => {
  const result = QUERY_SHAPES.top_merchants(FIXTURE_FACTS_PACK, {
    date_from: '2026-03-01',
    date_to: '2026-04-30',
  });
  assertEquals(result.query_type, 'top_merchants');
  // tesco express total = 12000 + 11000 = 23000 → first
  assertEquals(result.rows[0]!['merchant_key'], 'tesco express');
  assertEquals(result.rows[0]!['total_cents'], 23000);
});

// ---------------------------------------------------------------------------
// compare_periods
// ---------------------------------------------------------------------------

Deno.test('compare_periods — compares April vs March groceries', () => {
  const result = QUERY_SHAPES.compare_periods(FIXTURE_FACTS_PACK, {
    date_from: '2026-04-01',
    date_to: '2026-04-30',
    category_slugs: ['groceries'],
    compare_from: '2026-03-01',
    compare_to: '2026-03-31',
  });
  assertEquals(result.query_type, 'compare_periods');
  assertEquals(result.rows.length, 2);
  const periodA = result.rows.find((r) => r['period'] === 'a');
  const periodB = result.rows.find((r) => r['period'] === 'b');
  assertEquals(periodA!['sum_cents'], 24750);
  assertEquals(periodB!['sum_cents'], 21000);
});

// ---------------------------------------------------------------------------
// last_n_transactions_aggregate
// ---------------------------------------------------------------------------

Deno.test('last_n_transactions_aggregate — returns category breakdown', () => {
  const result = QUERY_SHAPES.last_n_transactions_aggregate(FIXTURE_FACTS_PACK, {
    date_from: '2026-04-01',
    date_to: '2026-04-30',
  });
  assertEquals(result.query_type, 'last_n_transactions_aggregate');
  const slugs = result.rows.map((r) => r['category_slug']);
  assert(slugs.includes('groceries'));
  assert(slugs.includes('dining'));
});
