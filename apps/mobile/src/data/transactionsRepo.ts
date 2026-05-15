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
import { monthStartEndUnixSec } from '../features/dashboard/monthMath';
import { buildFilterSql } from '../features/transactions/filterCompose';
import type { FilterState, Transaction } from '../features/transactions/types';

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

// ---------------------------------------------------------------------------
// listByMonth (Phase 2 — transaction list, dashboard breakdown)
// ---------------------------------------------------------------------------

/**
 * Returns all transactions whose `date` falls within the calendar month
 * (year, month) in UTC, ordered by date DESC then id DESC.
 *
 * Parameters are bounded before query (defense in depth — T-02-01-01).
 */
export function listByMonth(year: number, month: number): TransactionRow[] {
  const yi = Math.floor(Number(year));
  const mi = Math.floor(Number(month));
  if (!Number.isFinite(yi) || !Number.isFinite(mi)) return [];
  if (yi < 1900 || yi > 3000) return [];
  if (mi < 1 || mi > 12) return [];

  const { startSec, endSec } = monthStartEndUnixSec({ year: yi, month: mi });
  const db = getDB();
  const result = db.executeSync(
    `SELECT id, amount_cents, currency, merchant_name, merchant_id, mcc_code,
            category_id, account_id, description, date, source, external_id,
            created_at
     FROM transactions
     WHERE date >= ? AND date < ?
     ORDER BY date DESC, id DESC`,
    [startSec, endSec]
  );

  return result.rows.map((row) => ({
    id: row['id'] as number,
    amount_cents: row['amount_cents'] as number,
    currency: row['currency'] as string,
    merchant_name: row['merchant_name'] as string,
    merchant_id: (row['merchant_id'] as string | null) ?? null,
    mcc_code: (row['mcc_code'] as number | null) ?? null,
    category_id: (row['category_id'] as number | null) ?? null,
    account_id: (row['account_id'] as number | null) ?? null,
    description: (row['description'] as string | null) ?? null,
    date: row['date'] as number,
    source: row['source'] as string,
    external_id: (row['external_id'] as string | null) ?? null,
    created_at: row['created_at'] as number,
  }));
}

// ---------------------------------------------------------------------------
// Phase 2 plan 02-03 — listByFilter / updateCategory / getTransactionById /
// updateTransaction / searchByMerchant
// ---------------------------------------------------------------------------
//
// AI-safety contract (T-02-03-03 + 01-LEARNINGS):
// None of the SELECT/UPDATE statements below reference the `description`
// column. Phase 1 SKELETON locked description=NULL across all ingest paths;
// Phase 2 must not read or write it. The filterCompose unit test enforces
// the WHERE-clause side; this comment + grep in 02-03 Task 2 verify enforce
// the repo side.

/**
 * Projection row shape returned by the JOIN query — a flat subset of
 * transactions JOIN categories columns. The repo maps this to the
 * features/transactions Transaction shape (camelCase).
 *
 * Note: description column is INTENTIONALLY ABSENT here. The Phase 2 list /
 * detail / search surfaces never read it. AI-safety enforcement.
 */
type JoinRow = Readonly<{
  id: number;
  amount_cents: number;
  currency: string;
  merchant_name: string;
  category_id: number | null;
  category_name: string | null;
  icon_slug: string | null;
  color: string | null;
  date: number;
}>;

function joinRowToTransaction(row: JoinRow): Transaction {
  return {
    id: row.id,
    amountCents: row.amount_cents,
    currency: row.currency,
    merchantName: row.merchant_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIconSlug: row.icon_slug,
    categoryColor: row.color,
    dateSec: row.date,
  };
}

/** Defensive cap — Phase 5 will add pagination/windowing. */
const LIST_BY_FILTER_LIMIT = 5000;

/**
 * Returns transactions matching the supplied filter, joined with categories
 * for icon/color rendering. Ordered by date DESC, id DESC.
 *
 * The WHERE clause comes from filterCompose.buildFilterSql with positional
 * binds — no user input is ever interpolated into the SQL string.
 */
export function listByFilter(filter: FilterState): readonly Transaction[] {
  const { whereClause, params } = buildFilterSql(filter);
  const db = getDB();
  // We always rewrite simple column refs in the whereClause to be t-qualified
  // because the same column names exist on both sides of the JOIN. The
  // filterCompose unit test pins the literals — this is a stable contract.
  const qualifiedWhere = whereClause
    .replace(/(^|[^.])amount_cents/g, '$1t.amount_cents')
    .replace(/(^|[^.])merchant_name/g, '$1t.merchant_name')
    .replace(/(^|[^.])category_id/g, '$1t.category_id')
    .replace(/(^|[^.])\bdate\b/g, '$1t.date');

  const sql =
    `SELECT t.id           AS id,
            t.amount_cents AS amount_cents,
            t.currency     AS currency,
            t.merchant_name AS merchant_name,
            t.category_id  AS category_id,
            c.name_en      AS category_name,
            c.icon_name    AS icon_slug,
            c.color        AS color,
            t.date         AS date
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
      WHERE ${qualifiedWhere}
      ORDER BY t.date DESC, t.id DESC
      LIMIT ${LIST_BY_FILTER_LIMIT}`;

  const result = db.executeSync(sql, params as (string | number)[]);
  return result.rows.map((row) =>
    joinRowToTransaction({
      id: row['id'] as number,
      amount_cents: row['amount_cents'] as number,
      currency: row['currency'] as string,
      merchant_name: row['merchant_name'] as string,
      category_id: (row['category_id'] as number | null) ?? null,
      category_name: (row['category_name'] as string | null) ?? null,
      icon_slug: (row['icon_slug'] as string | null) ?? null,
      color: (row['color'] as string | null) ?? null,
      date: row['date'] as number,
    })
  );
}

/**
 * Reassigns a single transaction to a new category. Parameterized — no
 * string interpolation.
 */
export function updateCategory(txId: number, categoryId: number): void {
  if (!Number.isInteger(txId) || txId <= 0) {
    throw new Error('updateCategory: invalid txId');
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new Error('updateCategory: invalid categoryId');
  }
  const db = getDB();
  db.executeSync('UPDATE transactions SET category_id = ? WHERE id = ?', [
    categoryId,
    txId,
  ]);
}

/**
 * Convenience wrapper around listByFilter for the debounced live merchant
 * search. The downstream screen actually uses listByFilter via filterStore;
 * this is exposed for any future surface that needs a quick lookup.
 */
export function searchByMerchant(query: string, limit: number): readonly Transaction[] {
  const filter: FilterState = {
    search: query,
    categoryIds: [],
    minCents: null,
    maxCents: null,
    sign: 'both',
    dateFromISO: null,
    dateToISO: null,
  };
  const rows = listByFilter(filter);
  return rows.slice(0, Math.max(0, Math.floor(limit)));
}

/**
 * Returns the joined Transaction projection for a single id, or null.
 */
export function getTransactionById(id: number): Transaction | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  const db = getDB();
  const result = db.executeSync(
    `SELECT t.id           AS id,
            t.amount_cents AS amount_cents,
            t.currency     AS currency,
            t.merchant_name AS merchant_name,
            t.category_id  AS category_id,
            c.name_en      AS category_name,
            c.icon_name    AS icon_slug,
            c.color        AS color,
            t.date         AS date
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
      WHERE t.id = ?
      LIMIT 1`,
    [id]
  );
  const row = result.rows[0];
  if (row == null) return null;
  return joinRowToTransaction({
    id: row['id'] as number,
    amount_cents: row['amount_cents'] as number,
    currency: row['currency'] as string,
    merchant_name: row['merchant_name'] as string,
    category_id: (row['category_id'] as number | null) ?? null,
    category_name: (row['category_name'] as string | null) ?? null,
    icon_slug: (row['icon_slug'] as string | null) ?? null,
    color: (row['color'] as string | null) ?? null,
    date: row['date'] as number,
  });
}

/**
 * Whitelist-driven partial update for a transaction.
 *
 * Accepted patch keys: merchant_name, amount_cents, occurred_at (mapped to
 * the schema's `date` column), category_id. Any other key is rejected before
 * the SQL is built (T-02-03-02 mitigation).
 */
export type UpdateTransactionPatch = Readonly<{
  merchant_name?: string;
  amount_cents?: number;
  occurred_at?: number; // unix seconds — written to the schema's `date` column
  category_id?: number | null;
}>;

const UPDATE_TX_WHITELIST = ['merchant_name', 'amount_cents', 'occurred_at', 'category_id'] as const;
type UpdateTxKey = (typeof UPDATE_TX_WHITELIST)[number];

// ---------------------------------------------------------------------------
// Phase 3 — AI categorization extensions
// ---------------------------------------------------------------------------
// These functions operate on the three AI-column additions from migration v3:
//   ai_confidence REAL, needs_review INTEGER NOT NULL DEFAULT 0,
//   last_ai_attempt_at INTEGER
// All SQL is parameterized — no string interpolation.

export type CategoryBatchUpdate = Readonly<{
  id: number;
  category_id: number;
  ai_confidence: number;
  needs_review: boolean;
  last_ai_attempt_at: number;
}>;

/**
 * Bulk-updates AI categorization results for a batch of transactions in a
 * single BEGIN/COMMIT block. Each row gets category_id, ai_confidence,
 * needs_review (stored as 0/1 per op-sqlite INTEGER convention), and
 * last_ai_attempt_at (unix seconds) updated atomically.
 *
 * Parameterized — no string interpolation.
 */
export function updateCategoryBatch(updates: readonly CategoryBatchUpdate[]): void {
  if (updates.length === 0) return;
  const db = getDB();
  try {
    db.executeSync('BEGIN');
    for (const u of updates) {
      db.executeSync(
        `UPDATE transactions
            SET category_id = ?,
                ai_confidence = ?,
                needs_review = ?,
                last_ai_attempt_at = ?
          WHERE id = ?`,
        [
          u.category_id,
          u.ai_confidence,
          u.needs_review ? 1 : 0,
          u.last_ai_attempt_at,
          u.id,
        ],
      );
    }
    db.executeSync('COMMIT');
  } catch (err) {
    try {
      db.executeSync('ROLLBACK');
    } catch {
      // ROLLBACK failed — nothing more to do; rethrow original
    }
    throw err;
  }
}

/**
 * Sets the needs_review flag on a single transaction.
 * op-sqlite stores BOOLEAN as INTEGER 0/1.
 */
export function markNeedsReview(id: number, value: boolean): void {
  const db = getDB();
  db.executeSync(
    'UPDATE transactions SET needs_review = ? WHERE id = ?',
    [value ? 1 : 0, id],
  );
}

/**
 * Returns transactions that have no category assigned yet, ordered by most
 * recent first. Used by the AI categorization trigger to find rows to send
 * to the Edge Function.
 *
 * Default limit: 200 (prevents accidentally sending huge batches; Edge
 * Function caps at 50 rows per call — callers must chunk if needed).
 */
export function listUncategorized(limit = 200): readonly TransactionRow[] {
  const db = getDB();
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 1000));
  const result = db.executeSync(
    `SELECT id, amount_cents, currency, merchant_name, merchant_id, mcc_code,
            category_id, account_id, description, date, source, external_id,
            created_at
       FROM transactions
      WHERE category_id IS NULL
      ORDER BY date DESC
      LIMIT ?`,
    [safeLimit],
  );
  return result.rows.map((row) => ({
    id: row['id'] as number,
    amount_cents: row['amount_cents'] as number,
    currency: row['currency'] as string,
    merchant_name: row['merchant_name'] as string,
    merchant_id: (row['merchant_id'] as string | null) ?? null,
    mcc_code: (row['mcc_code'] as number | null) ?? null,
    category_id: (row['category_id'] as number | null) ?? null,
    account_id: (row['account_id'] as number | null) ?? null,
    description: (row['description'] as string | null) ?? null,
    date: row['date'] as number,
    source: row['source'] as string,
    external_id: (row['external_id'] as string | null) ?? null,
    created_at: row['created_at'] as number,
  }));
}

export function updateTransaction(id: number, patch: UpdateTransactionPatch): Transaction {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('updateTransaction: invalid id');
  }
  // Reject unknown keys before building any SQL — defense in depth.
  for (const key of Object.keys(patch)) {
    if (!UPDATE_TX_WHITELIST.includes(key as UpdateTxKey)) {
      throw new Error(`updateTransaction: rejected unknown key`);
    }
  }

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.merchant_name !== undefined) {
    sets.push('merchant_name = ?');
    values.push(patch.merchant_name);
  }
  if (patch.amount_cents !== undefined) {
    sets.push('amount_cents = ?');
    values.push(patch.amount_cents);
  }
  if (patch.occurred_at !== undefined) {
    // Schema column is `date`; surface API exposes occurred_at for forward-compat.
    sets.push('date = ?');
    values.push(patch.occurred_at);
  }
  if (patch.category_id !== undefined) {
    sets.push('category_id = ?');
    values.push(patch.category_id);
  }

  if (sets.length === 0) {
    const existing = getTransactionById(id);
    if (existing == null) throw new Error('updateTransaction: row not found');
    return existing;
  }

  values.push(id);
  const db = getDB();
  db.executeSync(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`, values);

  const after = getTransactionById(id);
  if (after == null) throw new Error('updateTransaction: row vanished');
  return after;
}
