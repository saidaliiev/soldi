/**
 * Unit tests for apps/mobile/src/lib/money.ts
 * Uses Node's built-in test runner (node:test) — no external framework.
 * Run via: npx tsx tests/money.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Path alias resolution via tsx + tsconfig paths not supported in plain node:test.
// Use relative import from tests/ → src/lib/
import { toCents, fromCents, parseAmount, formatMoney } from '../src/lib/money.js';

// ---------------------------------------------------------------------------
// toCents
// ---------------------------------------------------------------------------

test('toCents: 1.23 equals 123', () => {
  assert.strictEqual(toCents(1.23), 123);
});

test('toCents: handles float drift (0.1 + 0.2 = 30)', () => {
  assert.strictEqual(toCents(0.1 + 0.2), 30);
});

test('toCents: throws RangeError for Infinity', () => {
  assert.throws(() => toCents(Infinity), RangeError);
});

test('toCents: throws RangeError for NaN', () => {
  assert.throws(() => toCents(NaN), RangeError);
});

test('toCents: zero', () => {
  assert.strictEqual(toCents(0), 0);
});

// ---------------------------------------------------------------------------
// fromCents
// ---------------------------------------------------------------------------

test('fromCents: 123 equals 1.23', () => {
  assert.strictEqual(fromCents(123), 1.23);
});

test('fromCents: 0 equals 0', () => {
  assert.strictEqual(fromCents(0), 0);
});

test('fromCents: negative cents', () => {
  assert.strictEqual(fromCents(-500), -5);
});

// ---------------------------------------------------------------------------
// parseAmount
// ---------------------------------------------------------------------------

test('parseAmount: euro symbol with comma thousands', () => {
  assert.strictEqual(parseAmount('€1,234.56'), 1234.56);
});

test('parseAmount: space thousands comma decimal', () => {
  assert.strictEqual(parseAmount('1 234,56'), 1234.56);
});

test('parseAmount: returns null for "abc"', () => {
  assert.strictEqual(parseAmount('abc'), null);
});

test('parseAmount: plain integer string', () => {
  assert.strictEqual(parseAmount('100'), 100);
});

test('parseAmount: rejects > 1e12', () => {
  assert.strictEqual(parseAmount('2000000000000'), null);
});

// ---------------------------------------------------------------------------
// formatMoney
// ---------------------------------------------------------------------------

test('formatMoney: EUR 12345 cents in en-IE locale formats as euro 123.45', () => {
  const result = formatMoney({ amountCents: 12345, currency: 'EUR' }, 'en-IE');
  // Should contain "123.45" and a euro-related symbol
  assert.ok(result.includes('123.45'), `Expected 123.45 in "${result}"`);
  // en-IE formats EUR with the € symbol
  assert.ok(result.includes('€') || result.includes('EUR'), `Expected euro indicator in "${result}"`);
});
