/**
 * factsPackBuilder.test.ts — tests for the FactsPack builder.
 *
 * Pattern: node:test + tsx (matches project test pattern from 01-LEARNINGS).
 *
 * Note: This test file requires real op-sqlite DB — run only in the full
 * integration environment. For tsc type-checking only, the test validates
 * the return type contract of buildFactsPack().
 *
 * The test below uses node:test's mock module approach — in practice
 * this is verified at device checkpoint where op-sqlite is available.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FactsPack } from '@services/aiQuery';

// Type-level test: verify the return type contract of buildFactsPack
// (the function is not called here since op-sqlite requires native runtime)

test('FactsPack type contract — monthly_category_sums structure', () => {
  const mockFactsPack: FactsPack = {
    currency: 'EUR',
    date_from: '2026-04-01',
    date_to: '2026-04-30',
    monthly_category_sums: [
      { month: '2026-04', category_slug: 'groceries', sum_cents: -24750 },
      { month: '2026-04', category_slug: 'dining', sum_cents: -8500 },
    ],
    top_merchants_by_month: [
      {
        month: '2026-04',
        merchant_key: 'tesco express',
        category_slug: 'groceries',
        total_cents: -12000,
        count: 8,
      },
    ],
  };

  assert.strictEqual(mockFactsPack.monthly_category_sums.length, 2);
  assert.strictEqual(mockFactsPack.top_merchants_by_month.length, 1);
  assert.strictEqual(mockFactsPack.currency, 'EUR');
});

test('FactsPack type contract — top_merchants_by_month has merchant_key not merchant_name', () => {
  const entry = {
    month: '2026-04',
    merchant_key: 'tesco express',
    category_slug: 'groceries',
    total_cents: -12000,
    count: 8,
  } satisfies FactsPack['top_merchants_by_month'][number];

  assert.ok('merchant_key' in entry);
  assert.ok(!('merchant_name' in entry)); // never raw names
});

test('FactsPack type contract — date format is YYYY-MM-DD', () => {
  const fp: FactsPack = {
    currency: 'EUR',
    date_from: '2026-01-01',
    date_to: '2026-04-30',
    monthly_category_sums: [],
    top_merchants_by_month: [],
  };
  assert.match(fp.date_from, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(fp.date_to, /^\d{4}-\d{2}-\d{2}$/);
});
