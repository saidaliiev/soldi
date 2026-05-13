/**
 * DB migration test — verifies migration 001 applies cleanly.
 *
 * Strategy:
 * 1. Try to dynamic-import @op-engineering/op-sqlite (works on device and Node via op-sqlite node shim).
 * 2. If that fails, fall back to better-sqlite3 via an inline shim.
 * 3. If neither is available, SKIP with a clear reason.
 *
 * Run via: npx tsx tests/db-migration.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

import { MIGRATIONS } from '../src/lib/db/migrations.js';
import { splitStatements } from '../src/lib/db/index.js';

// ---------------------------------------------------------------------------
// TestDB: minimal interface shared between op-sqlite and better-sqlite3 shim
// ---------------------------------------------------------------------------

interface TestDB {
  /** Execute a single SQL statement synchronously. */
  executeSync(sql: string): { rows: Array<Record<string, unknown>> };
  close?(): void;
}

// ---------------------------------------------------------------------------
// runMigrationsOn — mirrors production logic; splits multi-statement SQL
// ---------------------------------------------------------------------------

function runMigrationsOn(db: TestDB): void {
  const result = db.executeSync('PRAGMA user_version');
  const firstRow = result.rows[0];
  const currentVersion: number =
    firstRow != null && typeof firstRow['user_version'] === 'number'
      ? Math.floor(firstRow['user_version'] as number)
      : 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);
  if (pending.length === 0) return;

  for (const migration of pending) {
    try {
      db.executeSync('BEGIN');

      const statements = splitStatements(migration.sql);
      for (const stmt of statements) {
        db.executeSync(stmt);
      }

      db.executeSync('PRAGMA user_version = ' + String(migration.version));
      db.executeSync('COMMIT');
    } catch (err) {
      try { db.executeSync('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  }
}

function getSchemaVersionFrom(db: TestDB): number {
  const result = db.executeSync('PRAGMA user_version');
  const row = result.rows[0];
  if (row == null) return 0;
  const val = row['user_version'];
  return typeof val === 'number' ? Math.floor(val) : 0;
}

function queryInt(db: TestDB, sql: string): number {
  const result = db.executeSync(sql);
  const row = result.rows[0];
  if (row == null) return 0;
  const val = Object.values(row)[0];
  return typeof val === 'number' ? val : parseInt(String(val), 10);
}

// ---------------------------------------------------------------------------
// better-sqlite3 shim — adapts its raw API to TestDB.executeSync interface
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeBetterSqliteShim(Database: new (p: string) => any): (dbPath: string) => TestDB {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (dbPath: string): TestDB => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawDb: any = new Database(dbPath);

    return {
      executeSync(sql: string) {
        const trimmed = sql.trim();

        if (/^PRAGMA\s+user_version\s*$/i.test(trimmed)) {
          // db.pragma returns array of rows; use simple:true to get scalar
          const num = rawDb.pragma('user_version', { simple: true }) as number;
          return { rows: [{ user_version: num }] };
        }

        if (/^PRAGMA\s+user_version\s*=\s*(\d+)/i.test(trimmed)) {
          // better-sqlite3: use db.pragma('user_version = N') for write pragmas
          const match = /PRAGMA\s+user_version\s*=\s*(\d+)/i.exec(trimmed);
          const version = match ? match[1] : '0';
          rawDb.pragma('user_version = ' + version);
          return { rows: [] };
        }

        if (/^PRAGMA\s+table_info/i.test(trimmed)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rows: any[] = rawDb.prepare(sql).all();
          return { rows };
        }

        if (/^SELECT\s+COUNT/i.test(trimmed)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const row: any = rawDb.prepare(sql).get();
          const val = Object.values(row ?? {})[0];
          const num = typeof val === 'number' ? val : parseInt(String(val ?? '0'), 10);
          return { rows: [{ count: num }] };
        }

        if (/^SELECT\s+/i.test(trimmed)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rows: any[] = rawDb.prepare(sql).all();
          return { rows };
        }

        // DDL, BEGIN, COMMIT, ROLLBACK, INSERT
        rawDb.prepare(sql).run();
        return { rows: [] };
      },
      close() {
        rawDb.close();
      },
    };
  };
}

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------

test('db-migration: migration 001 applies cleanly and is idempotent', async (t) => {
  let createTestDB: ((name: string) => TestDB) | null = null;

  // Path 1: better-sqlite3 (preferred for Node; our shim handles PRAGMA correctly)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bsql: any = await import('better-sqlite3').catch(() => null);
    if (bsql && bsql.default) {
      const makeDB = makeBetterSqliteShim(bsql.default);
      createTestDB = (name: string) => makeDB(path.join(os.tmpdir(), name));
    }
  } catch {
    // better-sqlite3 not installed
  }

  // Path 2: op-sqlite native (works on device/EAS with real JSI; Node shim has
  // known PRAGMA read limitations in executeSync — only used as last resort)
  if (createTestDB === null) {
    try {
      const opSqlite = await import('@op-engineering/op-sqlite');
      if (typeof opSqlite.open === 'function') {
        const dbModule = await import('../src/lib/db/index.js');
        createTestDB = (name: string) => {
          const nativeDB = dbModule.openTestDB(name);
          return {
            executeSync(sql: string) {
              const result = nativeDB.executeSync(sql);
              return { rows: result.rows as Array<Record<string, unknown>> };
            },
            close() { nativeDB.close(); },
          };
        };
      }
    } catch {
      // op-sqlite JSI module not loadable in this environment
    }
  }

  if (createTestDB === null) {
    t.skip('[db-migration.test] skipping — install better-sqlite3 to enable');
    console.warn('[db-migration.test] skipping — install better-sqlite3 to enable');
    return;
  }

  const dbName = `t-soldi-${Date.now()}.db`;
  const db = createTestDB(dbName);

  try {
    // First run: migration 001 should apply
    runMigrationsOn(db);

    const version = getSchemaVersionFrom(db);
    assert.strictEqual(version, 1, `Expected schema version 1, got ${version}`);

    // 18 default categories seeded
    const categoryCount = queryInt(db, 'SELECT COUNT(*) FROM categories');
    assert.strictEqual(categoryCount, 18, `Expected 18 categories, got ${categoryCount}`);

    // idx_transactions_date index must exist
    const indexCount = queryInt(
      db,
      "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_transactions_date'"
    );
    assert.strictEqual(indexCount, 1, 'Expected idx_transactions_date index to exist');

    // transactions table must have required columns
    const colsResult = db.executeSync("PRAGMA table_info('transactions')");
    const colNames = colsResult.rows.map((c) => String(c['name'] ?? ''));
    const required = ['id', 'amount_cents', 'currency', 'merchant_name', 'date', 'source', 'external_id'];
    for (const col of required) {
      assert.ok(colNames.includes(col), `Missing column '${col}' in transactions table`);
    }

    // Idempotency: second run must not throw, version stays at 1
    runMigrationsOn(db);
    const versionAfterRepeat = getSchemaVersionFrom(db);
    assert.strictEqual(versionAfterRepeat, 1, 'Version should still be 1 after repeated runMigrations');
  } finally {
    db.close?.();
    const tmpPath = path.join(os.tmpdir(), dbName);
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }
});
