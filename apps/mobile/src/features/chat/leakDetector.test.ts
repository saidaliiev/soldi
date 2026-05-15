/**
 * leakDetector.test.ts — tests for the client-side merchant leak detector.
 *
 * Pattern: node:test + tsx (matches project test pattern from 01-LEARNINGS).
 * Run via: npx tsx --test src/features/chat/leakDetector.test.ts
 *
 * Note: This project has no jest harness. Tests use node:test.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { detectMerchantLeak } from './leakDetector';
import type { FactsPack } from '@services/aiQuery';

const EMPTY_FACTS_PACK: FactsPack = {
  currency: 'EUR',
  date_from: '2026-04-01',
  date_to: '2026-04-30',
  monthly_category_sums: [],
  top_merchants_by_month: [],
};

const FACTS_PACK_WITH_TESCO: FactsPack = {
  currency: 'EUR',
  date_from: '2026-04-01',
  date_to: '2026-04-30',
  monthly_category_sums: [],
  top_merchants_by_month: [
    {
      merchant_key: 'tesco express',
      category_slug: 'groceries',
      total_cents: 1500,
      count: 3,
      month: '2026-04',
    },
  ],
};

test('detectMerchantLeak: fires on planted leak', () => {
  assert.strictEqual(
    detectMerchantLeak(
      'Last month you spent €15 at tesco express on groceries.',
      FACTS_PACK_WITH_TESCO,
    ),
    true,
  );
});

test('detectMerchantLeak: fires on case-mixed leak', () => {
  assert.strictEqual(
    detectMerchantLeak('You shopped at Tesco Express last week.', FACTS_PACK_WITH_TESCO),
    true,
  );
});

test('detectMerchantLeak: does not fire on aggregate-only prose', () => {
  assert.strictEqual(
    detectMerchantLeak('Last month you spent €15 on groceries.', FACTS_PACK_WITH_TESCO),
    false,
  );
});

test('detectMerchantLeak: ignores short keys (< 3 chars)', () => {
  const fpWithShortKey: FactsPack = {
    ...EMPTY_FACTS_PACK,
    top_merchants_by_month: [
      {
        merchant_key: 'ab',
        category_slug: 'other',
        total_cents: 500,
        count: 1,
        month: '2026-04',
      },
    ],
  };
  assert.strictEqual(detectMerchantLeak('any ab text here', fpWithShortKey), false);
});

test('detectMerchantLeak: handles empty FactsPack', () => {
  assert.strictEqual(detectMerchantLeak('anything', EMPTY_FACTS_PACK), false);
});
