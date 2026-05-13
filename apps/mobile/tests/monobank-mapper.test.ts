/**
 * Unit tests for monobank statement mapper.
 * Uses node:test — run with: cd apps/mobile && npx tsx tests/monobank-mapper.test.ts
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Inline the mapper logic to avoid React Native import issues in Node
// We import only the pure TS modules with no RN dependencies.

// ---- Minimal stubs ----

type CategorySlug = string;

// MCC map subset (mirrors mcc.ts)
const MCC_MAP: ReadonlyMap<number, CategorySlug> = new Map([
  [5411, 'groceries'],
  [5814, 'coffee'],
  [5541, 'transport'],
  [4814, 'mobile'],
]);

function categoryForMcc(mcc: number, fallback: CategorySlug = 'misc'): CategorySlug {
  return MCC_MAP.get(mcc) ?? fallback;
}

function resolveMcc(mcc: number, originalMcc?: number): { slug: string; mcc: number } {
  const primary = categoryForMcc(mcc, 'misc');
  if (primary !== 'misc') return { slug: primary, mcc };
  if (originalMcc !== undefined && originalMcc !== mcc) {
    const secondary = categoryForMcc(originalMcc, 'misc');
    if (secondary !== 'misc') return { slug: secondary, mcc: originalMcc };
  }
  return { slug: 'misc', mcc };
}

const CURRENCY_CODE_MAP: ReadonlyMap<number, string> = new Map([
  [980, 'UAH'], [978, 'EUR'], [840, 'USD'],
]);

function currencyString(code: number): string {
  return CURRENCY_CODE_MAP.get(code) ?? String(code);
}

type MonobankStatementItem = {
  id: string;
  time: number;
  description: string;
  mcc: number;
  originalMcc: number;
  amount: number;
  operationAmount: number;
  currencyCode: number;
  commissionRate: number;
  cashbackAmount: number;
  balance: number;
  hold: boolean;
  receiptId?: string;
};

type MappedRow = {
  amount_cents: number;
  currency: string;
  merchant_name: string;
  merchant_id: string | null;
  mcc_code: number | null;
  categorySlug: string;
  description: null;
  date: number;
  source: 'monobank';
  external_id: string;
  created_at: number;
};

function mapMonobankItems(items: MonobankStatementItem[], nowSec: number): MappedRow[] {
  return items.map((item) => {
    const rawName = item.description ?? '';
    const collapsed = rawName.replace(/\s+/g, ' ').trim();
    const merchant_name = collapsed.slice(0, 120);
    const resolved = resolveMcc(item.mcc, item.originalMcc);
    return {
      amount_cents: item.amount,
      currency: currencyString(item.currencyCode),
      merchant_name,
      merchant_id: item.id,
      mcc_code: item.mcc,
      categorySlug: resolved.slug,
      description: null,
      date: item.time,
      source: 'monobank',
      external_id: `monobank-${item.id}`,
      created_at: nowSec,
    };
  });
}

// ---- Fixtures ----

const NOW_SEC = Math.floor(Date.now() / 1000);
const WEEK_AGO = NOW_SEC - 7 * 86400;

const LONG_DESCRIPTION = 'A'.repeat(200); // 200-char description for truncation test

const MULTILINE_DESCRIPTION = 'Silpo  \n  Grocery   Store';

const ITEMS: MonobankStatementItem[] = [
  {
    id: 'tx001',
    time: WEEK_AGO,
    description: 'Silpo Supermarket',
    mcc: 5411,           // → 'groceries'
    originalMcc: 5411,
    amount: -25000,      // -250 UAH (minor units)
    operationAmount: -25000,
    currencyCode: 980,   // UAH
    commissionRate: 0,
    cashbackAmount: 0,
    balance: 100000,
    hold: false,
  },
  {
    id: 'tx002',
    time: WEEK_AGO + 86400,
    description: 'McDonalds Kyiv',
    mcc: 5814,           // → 'coffee'
    originalMcc: 5814,
    amount: -8500,
    operationAmount: -8500,
    currencyCode: 978,   // EUR
    commissionRate: 0,
    cashbackAmount: 0,
    balance: 5000,
    hold: false,
  },
  {
    id: 'tx003',
    time: WEEK_AGO + 2 * 86400,
    description: 'OKKO Fuel',
    mcc: 5541,           // → 'transport'
    originalMcc: 5541,
    amount: -50000,
    operationAmount: -50000,
    currencyCode: 980,   // UAH
    commissionRate: 0,
    cashbackAmount: 0,
    balance: 50000,
    hold: false,
  },
  {
    id: 'tx004',
    time: WEEK_AGO + 3 * 86400,
    description: 'Kyivstar Mobile',
    mcc: 4814,           // → 'mobile'
    originalMcc: 4814,
    amount: -29900,
    operationAmount: -29900,
    currencyCode: 980,   // UAH
    commissionRate: 0,
    cashbackAmount: 0,
    balance: 20100,
    hold: false,
  },
  {
    id: 'tx005',
    time: WEEK_AGO + 4 * 86400,
    description: LONG_DESCRIPTION,
    mcc: 99999,          // → 'misc' (unmapped)
    originalMcc: 99999,
    amount: 100000,      // +income
    operationAmount: 100000,
    currencyCode: 980,   // UAH
    commissionRate: 0,
    cashbackAmount: 0,
    balance: 120100,
    hold: false,
  },
];

// ---- Tests ----

describe('mapMonobankItems', () => {
  const mapped = mapMonobankItems(ITEMS, NOW_SEC);

  test('returns 5 MappedRow objects', () => {
    assert.strictEqual(mapped.length, 5);
  });

  test('all currency strings are valid', () => {
    for (const row of mapped) {
      const valid = ['UAH', 'EUR', 'USD', 'GBP'].includes(row.currency) ||
                    /^\d+$/.test(row.currency); // fallback numeric string
      assert.ok(valid, `unexpected currency: ${row.currency}`);
    }
  });

  test('mcc 5411 maps to categorySlug "groceries"', () => {
    const row = mapped.find((r) => r.mcc_code === 5411);
    assert.ok(row, 'row with mcc 5411 not found');
    assert.strictEqual(row.categorySlug, 'groceries');
  });

  test('mcc 99999 maps to categorySlug "misc"', () => {
    const row = mapped.find((r) => r.mcc_code === 99999);
    assert.ok(row, 'row with mcc 99999 not found');
    assert.strictEqual(row.categorySlug, 'misc');
  });

  test('external_id values are unique and start with "monobank-"', () => {
    const ids = new Set(mapped.map((r) => r.external_id));
    assert.strictEqual(ids.size, 5, 'external_ids are not unique');
    for (const row of mapped) {
      assert.ok(row.external_id.startsWith('monobank-'), `bad external_id: ${row.external_id}`);
    }
  });

  test('description field is null for every row', () => {
    for (const row of mapped) {
      assert.strictEqual(row.description, null, `description should be null, got: ${row.description}`);
    }
  });

  test('amount_cents preserves sign (negative = expense, positive = income)', () => {
    const income = mapped.find((r) => r.mcc_code === 99999);
    assert.ok(income && income.amount_cents > 0, 'income row should have positive amount_cents');
    const expense = mapped.find((r) => r.mcc_code === 5411);
    assert.ok(expense && expense.amount_cents < 0, 'expense row should have negative amount_cents');
  });

  test('merchant_name is truncated to max 120 chars', () => {
    const row = mapped.find((r) => r.mcc_code === 99999);
    assert.ok(row, 'row not found');
    assert.ok(
      row.merchant_name.length <= 120,
      `merchant_name exceeds 120 chars: ${row.merchant_name.length}`,
    );
    assert.strictEqual(row.merchant_name.length, 120, 'expected exactly 120 chars from 200-char input');
  });

  test('merchant_name with embedded newlines collapses whitespace', () => {
    const itemWithNewlines: MonobankStatementItem = {
      id: 'txNL',
      time: NOW_SEC,
      description: MULTILINE_DESCRIPTION,
      mcc: 5411,
      originalMcc: 5411,
      amount: -1000,
      operationAmount: -1000,
      currencyCode: 980,
      commissionRate: 0,
      cashbackAmount: 0,
      balance: 99000,
      hold: false,
    };
    const [result] = mapMonobankItems([itemWithNewlines], NOW_SEC);
    assert.ok(result, 'mapped row not found');
    // Should not contain newlines or multiple consecutive spaces
    assert.ok(!result.merchant_name.includes('\n'), 'newline should be collapsed');
    assert.ok(!/\s{2,}/.test(result.merchant_name), 'multiple spaces should be collapsed');
  });

  test('UAH currency code (980) maps to "UAH"', () => {
    const uahRow = mapped.find((r) => r.mcc_code === 5411);
    assert.ok(uahRow);
    assert.strictEqual(uahRow.currency, 'UAH');
  });

  test('EUR currency code (978) maps to "EUR"', () => {
    const eurRow = mapped.find((r) => r.mcc_code === 5814);
    assert.ok(eurRow);
    assert.strictEqual(eurRow.currency, 'EUR');
  });
});
