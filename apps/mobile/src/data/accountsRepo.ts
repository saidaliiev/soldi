/**
 * SOLDI accounts repository.
 *
 * Provides idempotent ensureDefaultAccount() used during onboarding ingest.
 * op-sqlite v15 executeSync() — one statement per call, no multi-statement strings.
 *
 * Security: Parameterized INSERT — no string interpolation of user data.
 */

import { getDB } from '@lib/db';
import { nowSeconds } from '@lib/time';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountRow = {
  id: number;
  name: string;
  balance_cents: number;
  currency: string;
  type: 'cash' | 'bank' | 'card';
  source: 'synthetic' | 'manual' | 'monobank' | 'csv';
  created_at: number;
};

// ---------------------------------------------------------------------------
// Per-source defaults
// ---------------------------------------------------------------------------

const ACCOUNT_DEFAULTS: Record<
  AccountRow['source'],
  { name: string; type: AccountRow['type']; currency: string }
> = {
  synthetic: { name: 'Demo wallet',     type: 'bank',  currency: 'EUR' },
  manual:    { name: 'Manual entries',  type: 'cash',  currency: 'EUR' },
  monobank:  { name: 'monobank',        type: 'card',  currency: 'EUR' },
  csv:       { name: 'CSV import',      type: 'card',  currency: 'EUR' },
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns the id of the default account for the given source.
 *
 * If no account exists yet, inserts one with sensible defaults (name,
 * type, currency per source) and returns the new row's id.
 *
 * Idempotent: calling multiple times with the same source always returns
 * the same id (first-write wins — no duplicate accounts).
 *
 * @param source - The data ingest source to create/find an account for.
 * @returns The account id (integer primary key).
 */
export function ensureDefaultAccount(source: AccountRow['source']): number {
  const db = getDB();

  // Check if account for this source already exists
  const existing = db.executeSync(
    'SELECT id FROM accounts WHERE source = ? LIMIT 1',
    [source]
  );
  const existingRow = existing.rows[0];
  if (existingRow != null) {
    return existingRow['id'] as number;
  }

  // Insert a new default account for this source
  const defaults = ACCOUNT_DEFAULTS[source];
  const created = nowSeconds();

  const inserted = db.executeSync(
    `INSERT INTO accounts (name, balance_cents, currency, type, source, created_at)
     VALUES (?, 0, ?, ?, ?, ?)`,
    [defaults.name, defaults.currency, defaults.type, source, created]
  );

  // op-sqlite v15: insertId is available on the result of an INSERT
  const insertId = inserted.insertId;
  if (insertId == null) {
    throw new Error(`ensureDefaultAccount: INSERT did not return an insertId for source '${source}'`);
  }
  return insertId;
}
