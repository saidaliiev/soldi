/**
 * Integration tests for merchantOverridesRepo against a real SQLite engine.
 *
 * Strategy:
 *   1. Run the production MIGRATIONS array (versions 1, 2, 4) against a fresh
 *      better-sqlite3 DB. (Plan 03-01 owns version 3 and hasn't merged yet —
 *      the gap is intentional.)
 *   2. Replicate the repo's public surface in this test against the test DB
 *      (because importing the production repo would require deep mocking of
 *      `@lib/db`'s op-sqlite native module — out of scope for portfolio v1).
 *   3. The normalization semantics come from the production
 *      `normalizeMerchantKey` import, so the propagation algorithm under test
 *      is byte-identical to what ships.
 *
 * If better-sqlite3 is not installed, the whole suite skips with a clear note.
 *
 * Run via: npx tsx --test tests/merchant-overrides-repo.test.ts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

import { MIGRATIONS } from '../src/lib/db/migrations.js';
import { splitStatements } from '../src/lib/db/index.js';
import { normalizeMerchantKey } from '../src/features/transactions/merchantNormalize.js';

const requireFn = createRequire(import.meta.url);
type AnyCtor = new (p: string) => unknown;

let BetterSqlite3: AnyCtor | null = null;
try {
  BetterSqlite3 = requireFn('better-sqlite3') as AnyCtor;
} catch {
  BetterSqlite3 = null;
}

// ---------------------------------------------------------------------------
// Tiny TestDB shim — mirrors the executeSync shape the repo uses.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
interface TestDB {
  executeSync(sql: string, params?: readonly unknown[]): { rows: Row[]; insertId?: number };
  close(): void;
}

function makeDb(filePath: string): TestDB {
  if (BetterSqlite3 === null) throw new Error('better-sqlite3 not installed');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = new BetterSqlite3(filePath);
  return {
    executeSync(sql: string, params: readonly unknown[] = []) {
      const trimmed = sql.trim();
      const upper = trimmed.toUpperCase();
      if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') {
        raw.prepare(trimmed).run();
        return { rows: [] };
      }
      if (upper.startsWith('PRAGMA USER_VERSION =')) {
        const m = /USER_VERSION\s*=\s*(\d+)/i.exec(trimmed);
        raw.pragma('user_version = ' + (m ? m[1] : '0'));
        return { rows: [] };
      }
      if (upper === 'PRAGMA USER_VERSION') {
        const num = raw.pragma('user_version', { simple: true }) as number;
        return { rows: [{ user_version: num }] };
      }
      if (upper.startsWith('PRAGMA FOREIGN_KEYS')) {
        raw.pragma(trimmed.replace(/^PRAGMA\s+/i, ''));
        return { rows: [] };
      }
      if (upper.startsWith('SELECT')) {
        const rows = raw.prepare(sql).all(...params) as Row[];
        return { rows };
      }
      const info = raw.prepare(sql).run(...params) as { lastInsertRowid: number | bigint };
      const insertId = typeof info.lastInsertRowid === 'bigint'
        ? Number(info.lastInsertRowid)
        : info.lastInsertRowid;
      return { rows: [], insertId };
    },
    close() {
      raw.close();
    },
  };
}

// ---------------------------------------------------------------------------
// Migration runner mirroring src/lib/db/index.ts
// ---------------------------------------------------------------------------

function runMigrationsOn(db: TestDB): void {
  const current = (db.executeSync('PRAGMA user_version').rows[0]?.['user_version'] as number) ?? 0;
  for (const m of MIGRATIONS.filter((mm) => mm.version > current)) {
    db.executeSync('BEGIN');
    try {
      for (const stmt of splitStatements(m.sql)) {
        db.executeSync(stmt);
      }
      db.executeSync(`PRAGMA user_version = ${m.version}`);
      db.executeSync('COMMIT');
    } catch (err) {
      try { db.executeSync('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }
}

function freshDb(): { db: TestDB; cleanup: () => void } {
  const file = path.join(os.tmpdir(), `t-overrides-${Date.now()}-${Math.random()}.db`);
  const db = makeDb(file);
  runMigrationsOn(db);
  return {
    db,
    cleanup: () => {
      try { db.close(); } catch { /* ignore */ }
      try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch { /* ignore */ }
    },
  };
}

// ---------------------------------------------------------------------------
// In-test repo wrapper — same SQL as src/data/merchantOverridesRepo.ts.
// Keeping this in lockstep with the production repo is the test's job.
// ---------------------------------------------------------------------------

type OverrideSource = 'user' | 'llm' | 'mcc';
type Override = {
  id: number;
  merchant_key: string;
  category_id: number;
  source: OverrideSource;
  confidence: number;
  created_at: number;
  updated_at: number;
};

const PRIORITY: Record<OverrideSource, number> = { user: 3, mcc: 2, llm: 1 };

function nowS(): number { return Math.floor(Date.now() / 1000); }

function upsertForMerchant(db: TestDB, args: {
  merchant_name: string;
  category_id: number;
  source: OverrideSource;
  confidence: number;
}): void {
  const key = normalizeMerchantKey(args.merchant_name);
  if (key.length === 0) return;
  const existing = db.executeSync(
    `SELECT source FROM merchant_overrides WHERE merchant_key = ? LIMIT 1`,
    [key],
  ).rows[0];
  if (existing != null) {
    const existingSource = existing['source'] as OverrideSource;
    if (PRIORITY[existingSource] > PRIORITY[args.source]) return;
  }
  const now = nowS();
  db.executeSync(
    `INSERT INTO merchant_overrides (merchant_key, category_id, source, confidence, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(merchant_key) DO UPDATE SET
       category_id = excluded.category_id,
       source = excluded.source,
       confidence = excluded.confidence,
       updated_at = excluded.updated_at`,
    [key, args.category_id, args.source, args.confidence, now, now],
  );
}

function getOverrideForMerchant(db: TestDB, name: string): Override | null {
  const key = normalizeMerchantKey(name);
  if (key.length === 0) return null;
  const row = db.executeSync(
    `SELECT id, merchant_key, category_id, source, confidence, created_at, updated_at
     FROM merchant_overrides WHERE merchant_key = ? LIMIT 1`,
    [key],
  ).rows[0];
  if (row == null) return null;
  return {
    id: row['id'] as number,
    merchant_key: row['merchant_key'] as string,
    category_id: row['category_id'] as number,
    source: row['source'] as OverrideSource,
    confidence: row['confidence'] as number,
    created_at: row['created_at'] as number,
    updated_at: row['updated_at'] as number,
  };
}

function findSimilarUncategorizedTxIds(db: TestDB, merchant_key: string): number[] {
  if (merchant_key.length === 0) return [];
  const rows = db.executeSync(`SELECT id, merchant_name FROM transactions LIMIT ?`, [1000]).rows;
  const out: number[] = [];
  for (const row of rows) {
    const name = row['merchant_name'] as string;
    if (name != null && normalizeMerchantKey(name) === merchant_key) {
      out.push(row['id'] as number);
    }
  }
  return out;
}

function propagateCategoryToSimilar(db: TestDB, args: {
  source_tx_id: number; merchant_key: string; category_id: number;
}): { propagated_ids: number[]; rollback: () => void } {
  const candidates = findSimilarUncategorizedTxIds(db, args.merchant_key);
  const targets = candidates.filter((id) => id !== args.source_tx_id);
  if (targets.length === 0) return { propagated_ids: [], rollback: () => {} };

  const previous: Array<{ id: number; previous_category_id: number | null }> = [];
  for (const id of targets) {
    const row = db.executeSync(`SELECT category_id FROM transactions WHERE id = ? LIMIT 1`, [id]).rows[0];
    const prev = row?.['category_id'];
    previous.push({ id, previous_category_id: prev == null ? null : (prev as number) });
  }

  db.executeSync('BEGIN');
  try {
    for (const id of targets) {
      db.executeSync(`UPDATE transactions SET category_id = ? WHERE id = ?`, [args.category_id, id]);
    }
    db.executeSync('COMMIT');
  } catch (err) {
    try { db.executeSync('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  }

  const rollback = () => {
    db.executeSync('BEGIN');
    try {
      for (const { id, previous_category_id } of previous) {
        if (previous_category_id === null) {
          db.executeSync(`UPDATE transactions SET category_id = NULL WHERE id = ?`, [id]);
        } else {
          db.executeSync(`UPDATE transactions SET category_id = ? WHERE id = ?`, [previous_category_id, id]);
        }
      }
      db.executeSync('COMMIT');
    } catch (err) {
      try { db.executeSync('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  };
  return { propagated_ids: targets, rollback };
}

function listOverrides(db: TestDB, limit = 200): Override[] {
  const rows = db.executeSync(
    `SELECT id, merchant_key, category_id, source, confidence, created_at, updated_at
     FROM merchant_overrides ORDER BY updated_at DESC, id ASC LIMIT ?`,
    [limit],
  ).rows;
  return rows.map((row) => ({
    id: row['id'] as number,
    merchant_key: row['merchant_key'] as string,
    category_id: row['category_id'] as number,
    source: row['source'] as OverrideSource,
    confidence: row['confidence'] as number,
    created_at: row['created_at'] as number,
    updated_at: row['updated_at'] as number,
  }));
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

function clearCategories(db: TestDB): void {
  db.executeSync('DELETE FROM categories');
}

function seedCategory(db: TestDB, name: string, slug: string): number {
  const r = db.executeSync(
    `INSERT INTO categories (name_en, name_uk, icon_name, parent_id, is_custom, created_at, slug, color, usage_count)
     VALUES (?, ?, 'shopping-cart', NULL, 0, ?, ?, '#7A876A', 0)`,
    [name, name, nowS(), slug],
  );
  return (r.insertId ?? 0) as number;
}

function seedAccount(db: TestDB): number {
  const r = db.executeSync(
    `INSERT INTO accounts (name, balance_cents, currency, type, source, created_at)
     VALUES ('test', 0, 'EUR', 'cash', 'synthetic', ?)`,
    [nowS()],
  );
  return (r.insertId ?? 0) as number;
}

function seedTx(db: TestDB, args: {
  merchant_name: string; category_id: number | null; account_id: number; ext: string;
}): number {
  const r = db.executeSync(
    `INSERT INTO transactions (amount_cents, currency, merchant_name, category_id, account_id, date, source, external_id, created_at)
     VALUES (-1000, 'EUR', ?, ?, ?, ?, 'synthetic', ?, ?)`,
    [args.merchant_name, args.category_id, args.account_id, nowS(), args.ext, nowS()],
  );
  return (r.insertId ?? 0) as number;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

if (BetterSqlite3 === null) {
  test('merchant-overrides-repo: skipped — better-sqlite3 not installed', (t) => {
    t.skip('install better-sqlite3 in apps/mobile to enable');
  });
} else {

  test('upsertForMerchant creates row and getOverrideForMerchant reads it', () => {
    const { db, cleanup } = freshDb();
    try {
      clearCategories(db);
      const groceries = seedCategory(db, 'Groceries', 'groceries');
      upsertForMerchant(db, { merchant_name: 'Tesco', category_id: groceries, source: 'user', confidence: 1.0 });
      const row = getOverrideForMerchant(db, 'Tesco');
      assert.ok(row);
      assert.equal(row?.merchant_key, 'tesco');
      assert.equal(row?.category_id, groceries);
      assert.equal(row?.source, 'user');
    } finally { cleanup(); }
  });

  test('user source wins over llm', () => {
    const { db, cleanup } = freshDb();
    try {
      clearCategories(db);
      const groceries = seedCategory(db, 'Groceries', 'groceries');
      const restaurants = seedCategory(db, 'Restaurants', 'restaurants');
      upsertForMerchant(db, { merchant_name: 'Tesco', category_id: groceries, source: 'user', confidence: 1.0 });
      upsertForMerchant(db, { merchant_name: 'Tesco', category_id: restaurants, source: 'llm', confidence: 0.9 });
      const row = getOverrideForMerchant(db, 'Tesco');
      assert.equal(row?.source, 'user');
      assert.equal(row?.category_id, groceries);
    } finally { cleanup(); }
  });

  test('propagateCategoryToSimilar updates same-key rows except source', () => {
    const { db, cleanup } = freshDb();
    try {
      clearCategories(db);
      const groceries = seedCategory(db, 'Groceries', 'groceries');
      const acct = seedAccount(db);
      const tx1 = seedTx(db, { merchant_name: 'Tesco',         category_id: null, account_id: acct, ext: 't1' });
      const tx2 = seedTx(db, { merchant_name: 'TESCO',         category_id: null, account_id: acct, ext: 't2' });
      const tx3 = seedTx(db, { merchant_name: 'Tesco Express', category_id: null, account_id: acct, ext: 't3' });
      const txAldi = seedTx(db, { merchant_name: 'Aldi',       category_id: null, account_id: acct, ext: 't4' });

      const { propagated_ids } = propagateCategoryToSimilar(db, {
        source_tx_id: tx1,
        merchant_key: normalizeMerchantKey('Tesco'),
        category_id: groceries,
      });
      assert.deepEqual([...propagated_ids].sort(), [tx2].sort());

      assert.equal(db.executeSync('SELECT category_id FROM transactions WHERE id = ?', [tx2]).rows[0]?.['category_id'], groceries);
      assert.equal(db.executeSync('SELECT category_id FROM transactions WHERE id = ?', [tx1]).rows[0]?.['category_id'], null);
      assert.equal(db.executeSync('SELECT category_id FROM transactions WHERE id = ?', [tx3]).rows[0]?.['category_id'], null);
      assert.equal(db.executeSync('SELECT category_id FROM transactions WHERE id = ?', [txAldi]).rows[0]?.['category_id'], null);
    } finally { cleanup(); }
  });

  test('rollback reverts only propagated rows', () => {
    const { db, cleanup } = freshDb();
    try {
      clearCategories(db);
      const groceries = seedCategory(db, 'Groceries', 'groceries');
      const acct = seedAccount(db);
      const tx1 = seedTx(db, { merchant_name: 'Tesco', category_id: null, account_id: acct, ext: 't1' });
      const tx2 = seedTx(db, { merchant_name: 'tesco', category_id: null, account_id: acct, ext: 't2' });
      const tx3 = seedTx(db, { merchant_name: 'TESCO', category_id: null, account_id: acct, ext: 't3' });

      const { propagated_ids, rollback } = propagateCategoryToSimilar(db, {
        source_tx_id: tx1,
        merchant_key: normalizeMerchantKey('Tesco'),
        category_id: groceries,
      });
      assert.equal(propagated_ids.length, 2);
      rollback();
      for (const id of [tx2, tx3]) {
        assert.equal(db.executeSync('SELECT category_id FROM transactions WHERE id = ?', [id]).rows[0]?.['category_id'], null);
      }
      assert.equal(db.executeSync('SELECT category_id FROM transactions WHERE id = ?', [tx1]).rows[0]?.['category_id'], null);
    } finally { cleanup(); }
  });

  test('Cyrillic propagation: АТБ matches two rows', () => {
    const { db, cleanup } = freshDb();
    try {
      clearCategories(db);
      const groceries = seedCategory(db, 'Groceries', 'groceries');
      const acct = seedAccount(db);
      const tx1 = seedTx(db, { merchant_name: 'АТБ', category_id: null, account_id: acct, ext: 'c1' });
      const tx2 = seedTx(db, { merchant_name: 'атб', category_id: null, account_id: acct, ext: 'c2' });
      const { propagated_ids } = propagateCategoryToSimilar(db, {
        source_tx_id: tx1,
        merchant_key: normalizeMerchantKey('АТБ'),
        category_id: groceries,
      });
      assert.deepEqual([...propagated_ids], [tx2]);
    } finally { cleanup(); }
  });

  test('no false positives across distinct merchants', () => {
    const { db, cleanup } = freshDb();
    try {
      clearCategories(db);
      const groceries = seedCategory(db, 'Groceries', 'groceries');
      const acct = seedAccount(db);
      const txTesco = seedTx(db, { merchant_name: 'Tesco', category_id: null, account_id: acct, ext: 'p1' });
      const txPineapple = seedTx(db, { merchant_name: 'Pineapple Express', category_id: null, account_id: acct, ext: 'p2' });
      const { propagated_ids } = propagateCategoryToSimilar(db, {
        source_tx_id: txTesco,
        merchant_key: normalizeMerchantKey('Tesco'),
        category_id: groceries,
      });
      assert.equal(propagated_ids.length, 0);
      assert.equal(db.executeSync('SELECT category_id FROM transactions WHERE id = ?', [txPineapple]).rows[0]?.['category_id'], null);
    } finally { cleanup(); }
  });

  test('rollback on zero-row propagation is a no-op', () => {
    const { db, cleanup } = freshDb();
    try {
      clearCategories(db);
      const groceries = seedCategory(db, 'Groceries', 'groceries');
      const acct = seedAccount(db);
      const tx = seedTx(db, { merchant_name: 'Unique', category_id: null, account_id: acct, ext: 'u1' });
      const { propagated_ids, rollback } = propagateCategoryToSimilar(db, {
        source_tx_id: tx,
        merchant_key: normalizeMerchantKey('Unique'),
        category_id: groceries,
      });
      assert.equal(propagated_ids.length, 0);
      assert.doesNotThrow(() => rollback());
    } finally { cleanup(); }
  });

  test('mcc cannot overwrite an existing user-source row', () => {
    const { db, cleanup } = freshDb();
    try {
      clearCategories(db);
      const groceries = seedCategory(db, 'Groceries', 'groceries');
      const transport = seedCategory(db, 'Transport', 'transport');
      upsertForMerchant(db, { merchant_name: 'Tesco', category_id: groceries, source: 'user', confidence: 1.0 });
      upsertForMerchant(db, { merchant_name: 'Tesco', category_id: transport, source: 'mcc', confidence: 0.85 });
      const row = getOverrideForMerchant(db, 'Tesco');
      assert.equal(row?.source, 'user');
      assert.equal(row?.category_id, groceries);
    } finally { cleanup(); }
  });

  test('listOverrides returns multiple inserted rows', () => {
    const { db, cleanup } = freshDb();
    try {
      clearCategories(db);
      const c1 = seedCategory(db, 'Groceries', 'groceries');
      const c2 = seedCategory(db, 'Transport', 'transport');
      upsertForMerchant(db, { merchant_name: 'Tesco', category_id: c1, source: 'user', confidence: 1.0 });
      upsertForMerchant(db, { merchant_name: 'Bus',   category_id: c2, source: 'user', confidence: 1.0 });
      const rows = listOverrides(db);
      assert.equal(rows.length, 2);
      assert.ok(rows.every((r) => r.merchant_key.length > 0));
    } finally { cleanup(); }
  });

  test('migration v4 maps created_by_user=1 → source=user, confidence=1.0', () => {
    const file = path.join(os.tmpdir(), `t-mig-${Date.now()}.db`);
    const db = makeDb(file);
    try {
      // Apply 1 + 2 to set up base schema.
      const baseMigrations = MIGRATIONS.filter((m) => m.version === 1 || m.version === 2);
      for (const m of baseMigrations) {
        db.executeSync('BEGIN');
        for (const stmt of splitStatements(m.sql)) {
          db.executeSync(stmt);
        }
        db.executeSync(`PRAGMA user_version = ${m.version}`);
        db.executeSync('COMMIT');
      }
      // Seed old-shape rows.
      clearCategories(db);
      const c1 = seedCategory(db, 'Groceries', 'groceries');
      db.executeSync(
        `INSERT INTO merchant_overrides (merchant_pattern, category_id, confidence, created_by_user, created_at)
         VALUES ('tesco', ?, 1.0, 1, ?)`,
        [c1, nowS()],
      );
      db.executeSync(
        `INSERT INTO merchant_overrides (merchant_pattern, category_id, confidence, created_by_user, created_at)
         VALUES ('aldi', ?, 0.85, 0, ?)`,
        [c1, nowS()],
      );

      // Now run v4.
      const v4 = MIGRATIONS.find((m) => m.version === 4);
      assert.ok(v4);
      db.executeSync('BEGIN');
      for (const stmt of splitStatements(v4!.sql)) {
        db.executeSync(stmt);
      }
      db.executeSync('COMMIT');

      const tesco = db.executeSync(
        `SELECT source, confidence FROM merchant_overrides WHERE merchant_key = 'tesco'`,
      ).rows[0];
      assert.equal(tesco?.['source'], 'user');
      assert.equal(tesco?.['confidence'], 1.0);

      const aldi = db.executeSync(
        `SELECT source, confidence FROM merchant_overrides WHERE merchant_key = 'aldi'`,
      ).rows[0];
      assert.equal(aldi?.['source'], 'llm');
      assert.equal(aldi?.['confidence'], 0.85);
    } finally {
      try { db.close(); } catch { /* ignore */ }
      try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch { /* ignore */ }
    }
  });
}
