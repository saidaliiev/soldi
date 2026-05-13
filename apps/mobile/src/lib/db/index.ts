/**
 * SOLDI local SQLite DB — singleton accessor + migration runner.
 *
 * Security notes:
 * - No plaintext bank credentials ever stored here.
 * - Migration error logs contain only error.name (never SQL fragments or values).
 * - DB file lives in the app sandbox (iOS: Library/Application Support).
 *
 * op-sqlite v15 API notes:
 * - db.executeSync(sql) — synchronous; returns QueryResult with rows: Array<Record<string,Scalar>>
 * - executeSync accepts ONE statement per call (no multi-statement strings)
 * - PRAGMA user_version must receive a literal integer (no binding support for PRAGMA)
 */

import { open } from '@op-engineering/op-sqlite';
import type { DB as OPSQLiteDB } from '@op-engineering/op-sqlite';

import { MIGRATIONS } from './migrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DB = OPSQLiteDB;

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _db: DB | null = null;

/**
 * Returns the cached DB singleton, opening it on first call.
 * Safe to call multiple times — always returns the same connection.
 */
export function getDB(): DB {
  if (_db === null) {
    _db = open({ name: 'soldi.db' });
  }
  return _db;
}

/**
 * Opens a fresh DB connection under the provided name (no singleton caching).
 * Used by node-only unit tests to create isolated temp databases.
 */
export function openTestDB(name: string): DB {
  return open({ name });
}

// ---------------------------------------------------------------------------
// Schema version
// ---------------------------------------------------------------------------

/**
 * Returns the current PRAGMA user_version for the given connection.
 */
export function getSchemaVersion(db: DB): number {
  const result = db.executeSync('PRAGMA user_version');
  const row = result.rows[0];
  if (row == null) return 0;
  const val = row['user_version'];
  return typeof val === 'number' ? Math.floor(val) : 0;
}

// ---------------------------------------------------------------------------
// SQL splitting
// ---------------------------------------------------------------------------

/**
 * Splits a multi-statement SQL string into individual statements.
 * Strips empty strings and comment-only lines.
 */
export function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
}

// ---------------------------------------------------------------------------
// Migration runner
// ---------------------------------------------------------------------------

/**
 * Applies all pending migrations in version order using executeSync.
 *
 * For each pending migration:
 * 1. BEGIN
 * 2. Execute each statement in the migration SQL individually
 * 3. Set PRAGMA user_version (literal integer — not bound)
 * 4. COMMIT
 *
 * On error: ROLLBACK then rethrow. The caller (root layout) logs only error.name.
 */
export function runMigrations(db: DB): void {
  const currentVersion = getSchemaVersion(db);

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);
  if (pending.length === 0) return;

  for (const migration of pending) {
    try {
      db.executeSync('BEGIN');

      const statements = splitStatements(migration.sql);
      for (const stmt of statements) {
        db.executeSync(stmt);
      }

      // Literal integer required — PRAGMA does not accept bound parameters
      db.executeSync('PRAGMA user_version = ' + String(migration.version));
      db.executeSync('COMMIT');
    } catch (err) {
      try {
        db.executeSync('ROLLBACK');
      } catch {
        // ROLLBACK itself failed — nothing further to do; rethrow original error
      }
      throw err;
    }
  }
}
