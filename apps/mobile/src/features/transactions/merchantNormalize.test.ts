/**
 * Tests for normalizeMerchantKey — node:test + tsx runner.
 *
 * Covers the 8 normalization rules from CONTEXT D-02 plus idempotence.
 * Run via: npx tsx --test src/features/transactions/merchantNormalize.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeMerchantKey } from './merchantNormalize';

test('normalizeMerchantKey: uppercase Latin lowercases', () => {
  assert.equal(normalizeMerchantKey('STARBUCKS'), 'starbucks');
});

test('normalizeMerchantKey: preserves single internal space', () => {
  assert.equal(normalizeMerchantKey('Tesco Express'), 'tesco express');
});

test('normalizeMerchantKey: strips Latin diacritics via NFKD', () => {
  assert.equal(normalizeMerchantKey('Café Krëm'), 'cafe krem');
});

test('normalizeMerchantKey: collapses multiple whitespace + trims', () => {
  assert.equal(normalizeMerchantKey('  multiple   spaces  '), 'multiple spaces');
});

test('normalizeMerchantKey: replaces punctuation with single space', () => {
  assert.equal(normalizeMerchantKey('PAYPAL *NETFLIX'), 'paypal netflix');
});

test('normalizeMerchantKey: preserves Cyrillic (Ukrainian)', () => {
  assert.equal(normalizeMerchantKey('АТБ Маркет'), 'атб маркет');
});

test('normalizeMerchantKey: preserves Cyrillic + drops non-alphanum punctuation', () => {
  assert.equal(normalizeMerchantKey('Сільпо #1234'), 'сільпо 1234');
});

test('normalizeMerchantKey: caps at 64 characters', () => {
  const out = normalizeMerchantKey('a'.repeat(100));
  assert.equal(out.length, 64);
  assert.equal(out, 'a'.repeat(64));
});

test('normalizeMerchantKey: empty input returns empty', () => {
  assert.equal(normalizeMerchantKey(''), '');
});

test('normalizeMerchantKey: pure punctuation returns empty', () => {
  assert.equal(normalizeMerchantKey('!@#$%^&*()'), '');
});

test('normalizeMerchantKey: idempotent on common inputs', () => {
  for (const raw of ['Tesco', 'АТБ', 'Café', 'PAYPAL *NETFLIX', 'Сільпо #1234']) {
    const once = normalizeMerchantKey(raw);
    const twice = normalizeMerchantKey(once);
    assert.equal(twice, once, `Expected idempotence for input ${JSON.stringify(raw)}`);
  }
});

test('normalizeMerchantKey: Chinese / Arabic collapse to empty (v1 ICP scope)', () => {
  // Per CONTEXT D-02 + the docstring: non-Latin / non-Cyrillic scripts collapse.
  assert.equal(normalizeMerchantKey('スターバックス'), '');
  assert.equal(normalizeMerchantKey('مقهى'), '');
});
