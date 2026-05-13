/**
 * Unit tests for apps/mobile/src/lib/synthetic/generator.ts
 *
 * Tests determinism, IE/UA ratio, coverage, salary rows, and external_id
 * uniqueness. Uses Node's built-in test runner — no external framework.
 *
 * Run via: npx tsx tests/synthetic.test.ts
 * (tsx resolves @lib/* aliases via tsconfig.json paths)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// tsx resolves @lib/* via tsconfig.json paths in the parent directory.
// Generators are pure functions so this import works without a native module shim.
import { generateSyntheticTransactions } from '../src/lib/synthetic/generator.js';
import type { SyntheticConfig } from '../src/lib/synthetic/generator.js';
import type { CategorySlug } from '../src/lib/synthetic/mcc.js';

// ---------------------------------------------------------------------------
// Shared test fixture
// ---------------------------------------------------------------------------

/** Maps the 18 SOLDI category slugs to sequential IDs (mirrors DB seed order). */
const SLUG_TO_ID: Record<CategorySlug, number> = {
  'groceries':      1,
  'transport':      2,
  'eating-out':     3,
  'coffee':         4,
  'rent':           5,
  'utilities':      6,
  'mobile':         7,
  'entertainment':  8,
  'health':         9,
  'clothing':      10,
  'gifts':         11,
  'transfers':     12,
  'salary':        13,
  'refunds':       14,
  'savings':       15,
  'kids':          16,
  'pets':          17,
  'misc':          18,
};

function makeCfg(seed: number): SyntheticConfig {
  return {
    seed,
    days: 90,
    minPerDay: 3,
    maxPerDay: 6,
    nowSeconds: 1747000000,
    ieRatio: 0.7,
    categoryIdResolver: (slug: CategorySlug) => SLUG_TO_ID[slug] ?? null,
  };
}

const BASE_CFG = makeCfg(42);
const out = generateSyntheticTransactions(BASE_CFG);

// ---------------------------------------------------------------------------
// Test 1: row count bounds
// ---------------------------------------------------------------------------

test('row count is within expected bounds (90*3 + salaries ≤ N ≤ 90*6 + salaries)', () => {
  // Regular rows: 90 * [3,6] = [270, 540]
  // Salary rows: 3 (days 1, 31, 61)
  const minExpected = 90 * 3;
  const maxExpected = 90 * 6 + 5; // small headroom for salary rows
  assert.ok(
    out.length >= minExpected && out.length <= maxExpected,
    `Expected ${minExpected}..${maxExpected} rows, got ${out.length}`
  );
});

// ---------------------------------------------------------------------------
// Test 2: row shape invariants
// ---------------------------------------------------------------------------

test('every row has a non-zero amount_cents', () => {
  for (const row of out) {
    assert.notStrictEqual(row.amount_cents, 0, 'amount_cents must not be zero');
  }
});

test('every row has currency in [EUR, UAH]', () => {
  for (const row of out) {
    assert.ok(
      row.currency === 'EUR' || row.currency === 'UAH',
      `Unexpected currency: ${row.currency}`
    );
  }
});

test('every row has a valid category_id between 1 and 18', () => {
  for (const row of out) {
    assert.ok(
      row.category_id >= 1 && row.category_id <= 18,
      `category_id out of range: ${row.category_id}`
    );
  }
});

test('every row has mcc_code > 0', () => {
  for (const row of out) {
    assert.ok(row.mcc_code > 0, `mcc_code must be positive, got ${row.mcc_code}`);
  }
});

test('every row date <= cfg.nowSeconds', () => {
  for (const row of out) {
    assert.ok(
      row.date <= BASE_CFG.nowSeconds,
      `date ${row.date} exceeds nowSeconds ${BASE_CFG.nowSeconds}`
    );
  }
});

test('every row date >= 90 days before nowSeconds (with 1-day tolerance)', () => {
  const lowerBound = BASE_CFG.nowSeconds - 90 * 86400 - 86400;
  for (const row of out) {
    assert.ok(
      row.date >= lowerBound,
      `date ${row.date} is before lower bound ${lowerBound}`
    );
  }
});

test('every row source is "synthetic"', () => {
  for (const row of out) {
    assert.strictEqual(row.source, 'synthetic');
  }
});

test('every row description is null', () => {
  for (const row of out) {
    assert.strictEqual(row.description, null, 'description must always be null');
  }
});

// ---------------------------------------------------------------------------
// Test 3: at least one salary row (income)
// ---------------------------------------------------------------------------

test('at least one salary row exists (category_id 13, positive amount)', () => {
  const salaryRows = out.filter(r => r.category_id === 13 && r.amount_cents > 0);
  assert.ok(
    salaryRows.length >= 1,
    `Expected at least 1 salary row, found ${salaryRows.length}`
  );
});

// ---------------------------------------------------------------------------
// Test 4: IE/UA ratio within expected range
// ---------------------------------------------------------------------------

test('IE rows fraction is within 0.6..0.8 (ieRatio jitter)', () => {
  const ieRows = out.filter(r => r.currency === 'EUR');
  const ratio = ieRows.length / out.length;
  assert.ok(
    ratio >= 0.6 && ratio <= 0.8,
    `IE ratio ${ratio.toFixed(3)} outside expected range 0.6..0.8`
  );
});

// ---------------------------------------------------------------------------
// Test 5: determinism — same seed produces identical output
// ---------------------------------------------------------------------------

test('same seed produces identical output (deep-equal)', () => {
  const run1 = generateSyntheticTransactions(makeCfg(42));
  const run2 = generateSyntheticTransactions(makeCfg(42));
  assert.deepStrictEqual(run1, run2, 'Two runs with seed 42 must be identical');
});

// ---------------------------------------------------------------------------
// Test 6: different seed produces different first row
// ---------------------------------------------------------------------------

test('different seed produces a different first row', () => {
  const runA = generateSyntheticTransactions(makeCfg(42));
  const runB = generateSyntheticTransactions(makeCfg(99));
  assert.ok(
    runA.length > 0 && runB.length > 0,
    'Both runs must produce at least one row'
  );
  // Check that at least the first row differs in amount or date
  const firstA = runA[0]!;
  const firstB = runB[0]!;
  const differs =
    firstA.amount_cents !== firstB.amount_cents ||
    firstA.date !== firstB.date ||
    firstA.merchant_name !== firstB.merchant_name;
  assert.ok(differs, 'First rows should differ between different seeds');
});

// ---------------------------------------------------------------------------
// Test 7: external_id values are all unique
// ---------------------------------------------------------------------------

test('external_id values are all unique', () => {
  const ids = out.map(r => r.external_id);
  const uniqueIds = new Set(ids);
  assert.strictEqual(
    uniqueIds.size,
    ids.length,
    `Duplicate external_ids found: ${ids.length} total, ${uniqueIds.size} unique`
  );
});
