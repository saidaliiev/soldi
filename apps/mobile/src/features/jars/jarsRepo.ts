/**
 * SOLDI jarsRepo — Phase 4 plan 04-01.
 *
 * All reads/writes are synchronous (op-sqlite executeSync).
 * Parameter binding via `?` placeholders — no string-concatenated user input
 * (T-04-01-01 mitigation).
 *
 * Catch blocks log only error.name, never jar names or amounts
 * (T-04-01-02 mitigation / CLAUDE.md security rule).
 *
 * All functions accept an optional `db` argument (defaults to getDB()) so
 * node tests can pass openTestDB() without touching the singleton.
 */

import type { DB } from '@op-engineering/op-sqlite';

import { getDB } from '@/src/lib/db';
import type { Jar, JarContribution } from './types';

// ---------------------------------------------------------------------------
// createJar
// ---------------------------------------------------------------------------

/**
 * Inserts a new jar and returns its auto-assigned id.
 */
export function createJar(
  input: {
    readonly name: string;
    readonly targetCents: number;
    readonly icon: string;
    readonly ruleJson: string;
  },
  db: DB = getDB(),
): number {
  const now = Math.floor(Date.now() / 1000);
  const result = db.executeSync(
    'INSERT INTO jars (name, target_cents, icon, rule_json, created_at) VALUES (?, ?, ?, ?, ?)',
    [input.name, input.targetCents, input.icon, input.ruleJson, now],
  );
  // WR-02: throw on null/0 insertId — 0 is an impossible row id for
  // AUTOINCREMENT tables (SQLite starts at 1). Returning 0 silently would
  // cause the caller to proceed as if the insert succeeded, call onRefresh(),
  // and show no jar in the list with no error feedback.
  const id = result.insertId;
  if (id == null || id === 0) {
    throw new Error('InsertFailed: createJar returned no insertId');
  }
  return id;
}

// ---------------------------------------------------------------------------
// listJars
// ---------------------------------------------------------------------------

/**
 * Returns all jars ordered by creation time descending.
 */
export function listJars(db: DB = getDB()): readonly Jar[] {
  const result = db.executeSync(
    'SELECT id, name, target_cents, icon, rule_json, created_at FROM jars ORDER BY created_at DESC',
  );
  return (result.rows ?? []).map(rowToJar);
}

// ---------------------------------------------------------------------------
// getJar
// ---------------------------------------------------------------------------

/**
 * Returns a single jar by id, or null if not found.
 */
export function getJar(id: number, db: DB = getDB()): Jar | null {
  const result = db.executeSync(
    'SELECT id, name, target_cents, icon, rule_json, created_at FROM jars WHERE id = ?',
    [id],
  );
  const row = (result.rows ?? [])[0];
  if (row == null) return null;
  return rowToJar(row);
}

// ---------------------------------------------------------------------------
// jarBalanceCents
// ---------------------------------------------------------------------------

/**
 * Returns the sum of all contributions for the given jar.
 * Returns 0 when no contributions exist (COALESCE handles the NULL case).
 */
export function jarBalanceCents(jarId: number, db: DB = getDB()): number {
  const result = db.executeSync(
    'SELECT COALESCE(SUM(amount_cents), 0) AS balance FROM jar_contributions WHERE jar_id = ?',
    [jarId],
  );
  const row = (result.rows ?? [])[0];
  if (row == null) return 0;
  const val = row['balance'];
  return typeof val === 'number' ? Math.floor(val) : 0;
}

// ---------------------------------------------------------------------------
// insertContribution
// ---------------------------------------------------------------------------

/**
 * Inserts a jar_contributions row and returns its id.
 */
export function insertContribution(
  c: {
    readonly jarId: number;
    readonly amountCents: number;
    readonly source: 'roundup' | 'manual';
    readonly txId: number | null;
    readonly createdAt: number;
  },
  db: DB = getDB(),
): number {
  const result = db.executeSync(
    'INSERT INTO jar_contributions (jar_id, amount_cents, source, tx_id, created_at) VALUES (?, ?, ?, ?, ?)',
    [c.jarId, c.amountCents, c.source, c.txId, c.createdAt],
  );
  return result.insertId ?? 0;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function rowToJar(row: Record<string, unknown>): Jar {
  return {
    id: Number(row['id']),
    name: String(row['name'] ?? ''),
    targetCents: Number(row['target_cents'] ?? 0),
    icon: String(row['icon'] ?? ''),
    ruleJson: String(row['rule_json'] ?? '{}'),
    createdAt: Number(row['created_at'] ?? 0),
  };
}

// Exported for test use only — gives tests access to the row-mapper without
// needing a real DB query result.
export { rowToJar as _rowToJar };

// Re-export JarContribution so consumers can import from jarsRepo directly
export type { Jar, JarContribution };
