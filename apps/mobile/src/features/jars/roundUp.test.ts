/**
 * Unit tests for roundUp — pure round-up math used by sweepRepo.
 *
 * Pattern: node:test + tsx (project Pattern 11).
 * Run via: npx tsx --test src/features/jars/roundUp.test.ts
 *
 * Tests cover D-01 (configurable unit), D-03 (EUR-only; income excluded).
 * No jest required — node:test + assert only.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { roundUpCents, pendingContributionCents } from './roundUp.js';

// ---------------------------------------------------------------------------
// roundUpCents
// ---------------------------------------------------------------------------

test('roundUpCents: income (positive) returns 0', () => {
  assert.strictEqual(roundUpCents(500, 100), 0);
});

test('roundUpCents: zero amount returns 0', () => {
  assert.strictEqual(roundUpCents(0, 100), 0);
});

test('roundUpCents: -437 with unit 100 → 63 (next €1 boundary)', () => {
  // abs = 437; 437 % 100 = 37; 100 - 37 = 63
  assert.strictEqual(roundUpCents(-437, 100), 63);
});

test('roundUpCents: -437 with unit 500 → 63 (next €5 boundary)', () => {
  // abs = 437; 437 % 500 = 437; 500 - 437 = 63
  assert.strictEqual(roundUpCents(-437, 500), 63);
});

test('roundUpCents: -437 with unit 1000 → 563 (next €10 boundary)', () => {
  // abs = 437; 437 % 1000 = 437; 1000 - 437 = 563
  assert.strictEqual(roundUpCents(-437, 1000), 563);
});

test('roundUpCents: -500 with unit 100 → 0 (already on boundary)', () => {
  assert.strictEqual(roundUpCents(-500, 100), 0);
});

test('roundUpCents: -500 with unit 500 → 0 (already on boundary)', () => {
  assert.strictEqual(roundUpCents(-500, 500), 0);
});

test('roundUpCents: -1 with unit 100 → 99', () => {
  assert.strictEqual(roundUpCents(-1, 100), 99);
});

// ---------------------------------------------------------------------------
// pendingContributionCents
// ---------------------------------------------------------------------------

test('pendingContributionCents: empty list → 0', () => {
  assert.strictEqual(pendingContributionCents([], 100), 0);
});

test('pendingContributionCents: sums EUR expenses correctly', () => {
  const expenses = [
    { amountCents: -437, currency: 'EUR' }, // roundUp 63
    { amountCents: -200, currency: 'EUR' }, // on boundary → 0
    { amountCents: -350, currency: 'EUR' }, // roundUp 50
  ];
  // 63 + 0 + 50 = 113
  assert.strictEqual(pendingContributionCents(expenses, 100), 113);
});

test('pendingContributionCents: ignores non-EUR rows (UAH excluded, D-03)', () => {
  const expenses = [
    { amountCents: -437, currency: 'EUR' }, // 63
    { amountCents: -437, currency: 'UAH' }, // excluded
  ];
  assert.strictEqual(pendingContributionCents(expenses, 100), 63);
});

test('pendingContributionCents: ignores income (positive amountCents)', () => {
  const expenses = [
    { amountCents: -437, currency: 'EUR' }, // 63
    { amountCents: 5000, currency: 'EUR' }, // income → excluded
  ];
  assert.strictEqual(pendingContributionCents(expenses, 100), 63);
});

test('pendingContributionCents: all non-EUR → 0', () => {
  const expenses = [
    { amountCents: -437, currency: 'UAH' },
    { amountCents: -200, currency: 'GBP' },
  ];
  assert.strictEqual(pendingContributionCents(expenses, 100), 0);
});

test('pendingContributionCents: works with unit 500', () => {
  const expenses = [
    { amountCents: -437, currency: 'EUR' }, // 63
    { amountCents: -750, currency: 'EUR' }, // 750%500=250; 500-250=250
  ];
  assert.strictEqual(pendingContributionCents(expenses, 500), 63 + 250);
});
