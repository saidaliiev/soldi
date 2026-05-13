/**
 * SOLDI transactions repository.
 *
 * Provides bulk insert, count, and sum queries for the transactions table.
 * All SQL uses parameterized executeSync() — no string interpolation.
 *
 * op-sqlite v15 notes:
 * - executeSync() is synchronous; one statement per call.
 * - BEGIN / COMMIT / ROLLBACK are individual executeSync() calls.
 * - rowsAffected tells us if INSERT OR IGNORE actually inserted or was skipped.
 *
 * Money sign convention (locked in 01-SKELETON):
 * - amount_cents negative = expense, positive = income.
 * - sumLastNDays sums ONLY negative rows (expenses) and returns abs value.
 */

import { getDB } from '@lib/db';
import { nowSeconds } from '@lib/time';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransactionRow = {
  id: number;
  amount_cents: number;
  currency: string;
  merchant_name: string;
  merchant_id: string | null;
  mcc_code: number | null;
  category_id: number | null;
  account_id: number | null;
  description: string | null;
  date: number;
  source: string;
  external_id: string | null;
  created_at: number;
};

/** Insertable row shape — all columns except auto-increment `id`. */
export type InsertableTransaction = Omit<TransactionRow, 'id'> & {
  external_id: string; // non-null required for INSERT OR IGNORE idempotency
};

// ---------------------------------------------------------------------------
// insertManyTransactions
// ---------------------------------------------------------------------------

/**
 * Inserts an array of transactions in a single BEGIN/COMMIT transaction.
 *
 * Uses INSERT OR IGNORE — duplicate rows (same source + external_id) are
 * silently skipped. The caller can compare inserted vs. skipped counts to
 * detect re-runs.
 *
 * @returns { inserted: number; skipped: number }
 * @throws On any DB error — wraps in ROLLBACK before rethrowing.
 */
export function insertManyTransactions(
  rows: InsertableTransaction[]
): { inserted: number; skipped: number } {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  const db = getDB();
  let inserted = 0;

  try {
    db.executeSync('BEGIN');

    for (const row of rows) {
      const result = db.executeSync(
        `INSERT OR IGNORE INTO transactions
         (amount_cents, currency, merchant_name, merchant_id, mcc_code,
          category_id, account_id, description, date, source, external_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.amount_cents,
          row.currency,
          row.merchant_name,
          row.merchant_id ?? null,
          row.mcc_code ?? null,
          row.category_id ?? null,
          row.account_id ?? null,
          row.description ?? null,
          row.date,
          row.source,
          row.external_id,
          row.created_at ?? nowSeconds(),
        ]
      );
      inserted += result.rowsAffected ?? 0;
    }

    db.executeSync('COMMIT');
  } catch (err) {
    try {
      db.executeSync('ROLLBACK');
    } catch {
      // ROLLBACK itself failed — nothing further to do; rethrow original error
    }
    throw err;
  }

  const skipped = rows.length - inserted;
  return { inserted, skipped };
}

// ---------------------------------------------------------------------------
// countTransactions
// ---------------------------------------------------------------------------

/**
 * Returns the total number of rows in the transactions table.
 */
export function countTransactions(): number {
  const db = getDB();
  const result = db.executeSync('SELECT COUNT(*) AS n FROM transactions');
  const row = result.rows[0];
  if (row == null) return 0;
  return (row['n'] as number) ?? 0;
}

// ---------------------------------------------------------------------------
// sumLastNDays
// ---------------------------------------------------------------------------

/**
 * Returns the absolute sum of expense (negative amount_cents) transactions
 * from the last N days.
 *
 * The threshold is: nowSeconds() - days * 86400.
 * Only rows with amount_cents < 0 (expenses) are summed — income rows ignored.
 *
 * Returns 0 when there are no expense rows in the window.
 * Returns a positive integer (absolute value of the negative sum) in cents.
 */
export function sumLastNDays(days: number): number {
  const db = getDB();
  const threshold = nowSeconds() - days * 86400;

  const result = db.executeSync(
    `SELECT COALESCE(SUM(amount_cents), 0) AS s
     FROM transactions
     WHERE date >= ? AND amount_cents < 0`,
    [threshold]
  );
  const row = result.rows[0];
  if (row == null) return 0;

  // SUM of negative amounts is negative; return absolute value for display
  const s = (row['s'] as number) ?? 0;
  return Math.abs(s);
}
