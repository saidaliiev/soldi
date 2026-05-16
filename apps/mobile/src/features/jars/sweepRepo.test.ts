/**
 * Unit tests for sweepRepo — transactional round-up sweep writer.
 *
 * Pattern: node:test + assert (mirrors jarsRepo.test.ts).
 * Run via: npx tsx --test src/features/jars/sweepRepo.test.ts
 *
 * NOTE: jest harness is not set up in apps/mobile (see STATE.md [[jest-harness-missing]]).
 * This file must typecheck and lint but cannot be run in CI until the jest task is done.
 *
 * Coverage:
 *   - sweepToJar contributes EUR-expense round-ups correctly
 *   - second immediate sweep returns 0 (cutoff advanced, D-02 idempotency)
 *   - UAH expenses excluded (D-03)
 *   - income rows excluded (D-03)
 *   - zero-pending sweep inserts no contribution row
 *   - lastSweepAt returns 0 with no prior sweeps, then advances after sweep
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { runMigrations } from '@/src/lib/db';
import { openTestDB } from '@/src/lib/db/testDb';
import { createJar, jarBalanceCents, insertContribution } from './jarsRepo.js';
import { sweepToJar, lastSweepAt } from './sweepRepo.js';

// ---------------------------------------------------------------------------
// Helper — fresh isolated DB
// ---------------------------------------------------------------------------

function freshDB() {
  const db = openTestDB(':memory:');
  runMigrations(db);
  return db;
}

/**
 * Insert a transaction row directly (bypasses transactionsRepo import).
 * Only inserts the columns needed for sweep: amount_cents, currency, created_at.
 * Other required columns use safe defaults — no merchant/description (PII contract).
 */
function insertTx(
  db: ReturnType<typeof freshDB>,
  amountCents: number,
  currency: string,
  createdAt: number,
): void {
  // merchant_name and source are required NOT NULL columns.
  // We use a placeholder merchant_name (no real PII) and source='synthetic'.
  // description is intentionally omitted (NULL) per Phase-3 AI safety contract.
  db.executeSync(
    `INSERT INTO transactions (amount_cents, currency, merchant_name, date, source, account_id, category_id, created_at)
     VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
    [amountCents, currency, 'test-merchant', createdAt, 'synthetic', createdAt],
  );
}

// ---------------------------------------------------------------------------
// lastSweepAt: returns 0 when no sweeps have occurred
// ---------------------------------------------------------------------------

test('lastSweepAt returns 0 when no contributions exist', () => {
  const db = freshDB();
  const jarId = createJar(
    { name: 'Test', targetCents: 10000, icon: 'jar-star', ruleJson: '{"kind":"roundup","unitCents":100}' },
    db,
  );
  assert.strictEqual(lastSweepAt(jarId, db), 0);
});

// ---------------------------------------------------------------------------
// sweepToJar: contributes EUR round-ups; excludes UAH + income
// ---------------------------------------------------------------------------

test('sweepToJar contributes EUR expenses only (UAH + income excluded, D-03)', () => {
  const db = freshDB();
  const now = 1_700_000_000;

  const jarId = createJar(
    { name: 'Holiday', targetCents: 100000, icon: 'jar-plane', ruleJson: '{"kind":"roundup","unitCents":100}' },
    db,
  );

  // EUR expenses: -437 → roundUp 63; -200 → 0 (on boundary); -350 → 50
  insertTx(db, -437, 'EUR', now - 3000);
  insertTx(db, -200, 'EUR', now - 2000);
  insertTx(db, -350, 'EUR', now - 1000);

  // UAH expense — must be excluded (D-03)
  insertTx(db, -437, 'UAH', now - 500);

  // Income — must be excluded (D-03)
  insertTx(db, 5000, 'EUR', now - 100);

  const result = sweepToJar(jarId, now, db);

  // Expected: 63 + 0 + 50 = 113 (UAH + income excluded)
  assert.strictEqual(result.contributedCents, 113);
  assert.strictEqual(result.newBalanceCents, 113);
});

// ---------------------------------------------------------------------------
// sweepToJar: second immediate sweep returns 0 (cutoff advanced, D-02)
// ---------------------------------------------------------------------------

test('second immediate sweep contributes 0 — cutoff advanced after first sweep', () => {
  const db = freshDB();
  const t0 = 1_700_000_000;

  const jarId = createJar(
    { name: 'Rainy Day', targetCents: 50000, icon: 'jar-cloud', ruleJson: '{"kind":"roundup","unitCents":100}' },
    db,
  );

  insertTx(db, -437, 'EUR', t0 - 1000);

  // sweepToJar's `now` is MILLISECONDS (Date.now() contract — it stores the
  // sweep timestamp as Math.floor(now/1000) seconds). t0 is a seconds value
  // (matches transactions.created_at), so pass t0*1000.
  // First sweep at t0
  const first = sweepToJar(jarId, t0 * 1000, db);
  assert.ok(first.contributedCents > 0, 'first sweep must contribute');

  // Second sweep at t0 + 1s (no new transactions after t0)
  const second = sweepToJar(jarId, (t0 + 1) * 1000, db);
  assert.strictEqual(second.contributedCents, 0);
  // Balance unchanged
  assert.strictEqual(second.newBalanceCents, first.newBalanceCents);
});

// ---------------------------------------------------------------------------
// sweepToJar: zero-pending sweep inserts no contribution row
// ---------------------------------------------------------------------------

test('sweepToJar with zero pending inserts no jar_contributions row', () => {
  const db = freshDB();
  const now = 1_700_000_000;

  const jarId = createJar(
    { name: 'Empty', targetCents: 10000, icon: 'jar-star', ruleJson: '{"kind":"roundup","unitCents":100}' },
    db,
  );

  // Only on-boundary expense → roundUp = 0
  insertTx(db, -500, 'EUR', now - 100);

  const before = jarBalanceCents(jarId, db);
  const result = sweepToJar(jarId, now, db);

  assert.strictEqual(result.contributedCents, 0);
  // Balance unchanged
  assert.strictEqual(jarBalanceCents(jarId, db), before);
});

// ---------------------------------------------------------------------------
// sweepToJar: unit 500 (€5 rounding, D-01 configurable unit)
// ---------------------------------------------------------------------------

test('sweepToJar respects unitCents=500 from rule_json (D-01)', () => {
  const db = freshDB();
  const now = 1_700_000_000;

  const jarId = createJar(
    { name: 'Fiver', targetCents: 50000, icon: 'jar-star', ruleJson: '{"kind":"roundup","unitCents":500}' },
    db,
  );

  // -437 with unit 500 → 500-(437%500) = 500-437 = 63
  insertTx(db, -437, 'EUR', now - 1000);

  const result = sweepToJar(jarId, now, db);
  assert.strictEqual(result.contributedCents, 63);
});

// ---------------------------------------------------------------------------
// lastSweepAt advances after sweep
// ---------------------------------------------------------------------------

test('lastSweepAt returns the sweep timestamp after a successful sweep', () => {
  const db = freshDB();
  const sweepTime = 1_700_000_999;

  const jarId = createJar(
    { name: 'Track', targetCents: 10000, icon: 'jar-star', ruleJson: '{"kind":"roundup","unitCents":100}' },
    db,
  );
  insertTx(db, -437, 'EUR', sweepTime - 500);

  // `now` is milliseconds (see note above); sweepTime is a seconds value.
  sweepToJar(jarId, sweepTime * 1000, db);

  assert.strictEqual(lastSweepAt(jarId, db), sweepTime);
});

// ---------------------------------------------------------------------------
// sweepToJar: jar not found returns zeros
// ---------------------------------------------------------------------------

test('sweepToJar returns zeros for unknown jarId', () => {
  const db = freshDB();
  const result = sweepToJar(9999, Date.now(), db);
  assert.strictEqual(result.contributedCents, 0);
  assert.strictEqual(result.newBalanceCents, 0);
});

// ---------------------------------------------------------------------------
// Pre-existing contributions do not affect sweep amount (only new tx since cutoff)
// ---------------------------------------------------------------------------

test('pre-existing manual contributions do not pollute the sweep result', () => {
  const db = freshDB();
  const now = 1_700_000_000;

  const jarId = createJar(
    { name: 'Old', targetCents: 100000, icon: 'jar-star', ruleJson: '{"kind":"roundup","unitCents":100}' },
    db,
  );

  // Pre-existing manual contribution
  insertContribution({ jarId, amountCents: 5000, source: 'manual', txId: null, createdAt: now - 9000 }, db);

  // EUR expense after the manual contribution
  insertTx(db, -437, 'EUR', now - 100);

  const result = sweepToJar(jarId, now, db);
  // Only the round-up from -437 → 63 contributed (not the manual 5000)
  assert.strictEqual(result.contributedCents, 63);
  assert.strictEqual(result.newBalanceCents, 5063);
});
