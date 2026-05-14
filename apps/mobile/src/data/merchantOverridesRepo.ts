/**
 * SOLDI merchant overrides repository — exact-match on normalized merchant_key.
 *
 * Phase 3 / 03-02 rewrite. The Phase 1/2 substring-match schema
 * (the old pattern-column + LIKE flow) is replaced by exact equality on
 * normalizeMerchantKey(merchant_name). The corresponding DB migration
 * (SCHEMA_004_MERCHANT_OVERRIDES_V2, version 4) renames the column and
 * upgrades the data. See `merchantNormalize.ts` for the canonical
 * normalizer; the Edge Function copy in `supabase/functions/_shared/normalize.ts`
 * MUST stay byte-identical (verified by diff-gate in 03-02 verification).
 *
 * Public surface (post-rewrite):
 *   - getOverrideForMerchant(merchant_name)        — single-row exact lookup
 *   - upsertOverride({ merchant_key, ... })        — caller pre-normalizes
 *   - upsertForMerchant({ merchant_name, ... })    — convenience: normalizes then upserts
 *   - findSimilarUncategorizedTxIds(merchant_key)  — caps at 1000 rows (T-03-02-05)
 *   - propagateCategoryToSimilar({...})            — engine + rollback (CAT-04)
 *   - listOverrides(limit?)                        — debug surface
 *
 * Security (CLAUDE.md + threat model):
 *   - All SQL is parameterized via executeSync — no string interpolation.
 *   - User-source overrides always win over llm/mcc (D-04, T-03-02-03).
 *   - Propagation is wrapped in BEGIN/COMMIT; rollback() is atomic (T-03-02-04).
 *   - Never console.log merchant_name in production builds (CLAUDE.md §security).
 */

import { getDB } from '@lib/db';
import { nowSeconds } from '@lib/time';

import { normalizeMerchantKey } from '@/src/features/transactions/merchantNormalize';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OverrideSource = 'user' | 'llm' | 'mcc';

export type Override = {
  id: number;
  merchant_key: string;
  category_id: number;
  source: OverrideSource;
  confidence: number;
  created_at: number;
  updated_at: number;
};

type PropagationResult = {
  propagated_ids: readonly number[];
  rollback: () => void;
};

const FIND_SIMILAR_CAP = 1000;
const LIST_OVERRIDES_DEFAULT_LIMIT = 200;

const SOURCE_PRIORITY: Record<OverrideSource, number> = {
  user: 3,
  mcc: 2,
  llm: 1,
};

// ---------------------------------------------------------------------------
// Row helpers
// ---------------------------------------------------------------------------

function mapOverrideRow(row: Record<string, unknown>): Override {
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

// ---------------------------------------------------------------------------
// getOverrideForMerchant
// ---------------------------------------------------------------------------

/**
 * Returns the override for a merchant name (exact match on normalized key).
 *
 * @param merchant_name Raw merchant name; normalized internally.
 * @returns             The Override row, or null when no row exists.
 */
export function getOverrideForMerchant(merchant_name: string): Override | null {
  const db = getDB();
  const key = normalizeMerchantKey(merchant_name);
  if (key.length === 0) return null;

  const result = db.executeSync(
    `SELECT id, merchant_key, category_id, source, confidence, created_at, updated_at
     FROM merchant_overrides
     WHERE merchant_key = ?
     LIMIT 1`,
    [key],
  );
  const row = result.rows[0];
  if (row == null) return null;
  return mapOverrideRow(row);
}

// ---------------------------------------------------------------------------
// upsertOverride
// ---------------------------------------------------------------------------

/**
 * Upserts an override at the (already-normalized) merchant_key.
 *
 * Source-priority guard (D-04 / T-03-02-03): an existing `user`-source row
 * blocks any non-user write; an existing `mcc`-source row blocks `llm` writes.
 * Equal-priority writes replace in-place (idempotent updates allowed).
 *
 * Uses parameterized executeSync — no string interpolation.
 */
export function upsertOverride(args: {
  merchant_key: string;
  category_id: number;
  source: OverrideSource;
  confidence: number;
}): void {
  const db = getDB();
  const { merchant_key, category_id, source, confidence } = args;
  if (merchant_key.length === 0) return;

  const existing = db.executeSync(
    `SELECT source FROM merchant_overrides WHERE merchant_key = ? LIMIT 1`,
    [merchant_key],
  );
  const existingRow = existing.rows[0];
  if (existingRow != null) {
    const existingSource = existingRow['source'] as OverrideSource;
    if (SOURCE_PRIORITY[existingSource] > SOURCE_PRIORITY[source]) {
      // Higher-priority row wins; no-op.
      return;
    }
  }

  const now = nowSeconds();
  db.executeSync(
    `INSERT INTO merchant_overrides (merchant_key, category_id, source, confidence, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(merchant_key) DO UPDATE SET
       category_id = excluded.category_id,
       source = excluded.source,
       confidence = excluded.confidence,
       updated_at = excluded.updated_at`,
    [merchant_key, category_id, source, confidence, now, now],
  );
}

// ---------------------------------------------------------------------------
// upsertForMerchant
// ---------------------------------------------------------------------------

/**
 * Convenience wrapper — normalizes merchant_name then calls upsertOverride.
 */
export function upsertForMerchant(args: {
  merchant_name: string;
  category_id: number;
  source: OverrideSource;
  confidence: number;
}): void {
  const merchant_key = normalizeMerchantKey(args.merchant_name);
  if (merchant_key.length === 0) return;
  upsertOverride({
    merchant_key,
    category_id: args.category_id,
    source: args.source,
    confidence: args.confidence,
  });
}

// ---------------------------------------------------------------------------
// findSimilarUncategorizedTxIds
// ---------------------------------------------------------------------------

/**
 * Returns transaction ids whose merchant_name normalizes to merchant_key.
 *
 * SQL cannot run normalizeMerchantKey inside WHERE, so we read up to
 * FIND_SIMILAR_CAP (1000) candidate rows and filter in JS. The cap mitigates
 * pathological-merchant DoS (T-03-02-05).
 *
 * @param merchant_key Already-normalized merchant key (caller pre-normalizes).
 * @returns            Frozen list of transaction ids whose normalized name
 *                     matches merchant_key.
 */
export function findSimilarUncategorizedTxIds(merchant_key: string): readonly number[] {
  if (merchant_key.length === 0) return Object.freeze([]);
  const db = getDB();
  const result = db.executeSync(
    `SELECT id, merchant_name FROM transactions LIMIT ?`,
    [FIND_SIMILAR_CAP],
  );
  const ids: number[] = [];
  for (const row of result.rows) {
    const name = row['merchant_name'] as string;
    if (name == null) continue;
    if (normalizeMerchantKey(name) === merchant_key) {
      ids.push(row['id'] as number);
    }
  }
  return Object.freeze(ids);
}

// ---------------------------------------------------------------------------
// propagateCategoryToSimilar
// ---------------------------------------------------------------------------

/**
 * Propagation engine for CAT-04.
 *
 * Updates the category_id of every transaction whose normalized merchant_name
 * matches merchant_key, EXCEPT the source transaction the user explicitly
 * corrected (which the caller has already updated through a separate path).
 *
 * Atomicity: the multi-row UPDATE runs inside BEGIN/COMMIT. The returned
 * rollback() reverses every (id, previous_category_id) pair in a single
 * transaction. The caller's override upsert is intentionally NOT rolled back —
 * the user's correction stays permanent even after Undo on auto-applied rows
 * (per UI-SPEC §PropagationToast Undo behavior).
 *
 * @returns { propagated_ids, rollback }. rollback() is a no-op when no rows
 *          were propagated.
 */
export function propagateCategoryToSimilar(args: {
  source_tx_id: number;
  merchant_key: string;
  category_id: number;
}): PropagationResult {
  const { source_tx_id, merchant_key, category_id } = args;
  const candidateIds = findSimilarUncategorizedTxIds(merchant_key);
  const targetIds = candidateIds.filter((id) => id !== source_tx_id);

  if (targetIds.length === 0) {
    return {
      propagated_ids: Object.freeze([]),
      rollback: () => {
        // no-op
      },
    };
  }

  const db = getDB();
  const previous: { id: number; previous_category_id: number | null }[] = [];

  // Snapshot previous category_id values before updating, so rollback is exact.
  for (const id of targetIds) {
    const row = db.executeSync(
      `SELECT category_id FROM transactions WHERE id = ? LIMIT 1`,
      [id],
    ).rows[0];
    const prev = row?.['category_id'];
    previous.push({
      id,
      previous_category_id: prev == null ? null : (prev as number),
    });
  }

  // Atomic batch update.
  db.executeSync('BEGIN');
  try {
    for (const id of targetIds) {
      db.executeSync(
        `UPDATE transactions SET category_id = ? WHERE id = ?`,
        [category_id, id],
      );
    }
    db.executeSync('COMMIT');
  } catch (err) {
    try { db.executeSync('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  }

  const propagated_ids = Object.freeze([...targetIds]);
  const rollback = () => {
    if (previous.length === 0) return;
    const dbForRollback = getDB();
    dbForRollback.executeSync('BEGIN');
    try {
      for (const { id, previous_category_id } of previous) {
        if (previous_category_id === null) {
          dbForRollback.executeSync(
            `UPDATE transactions SET category_id = NULL WHERE id = ?`,
            [id],
          );
        } else {
          dbForRollback.executeSync(
            `UPDATE transactions SET category_id = ? WHERE id = ?`,
            [previous_category_id, id],
          );
        }
      }
      dbForRollback.executeSync('COMMIT');
    } catch (err) {
      try { dbForRollback.executeSync('ROLLBACK'); } catch { /* ignore */ }
      throw err;
    }
  };

  return { propagated_ids, rollback };
}

// ---------------------------------------------------------------------------
// listOverrides
// ---------------------------------------------------------------------------

/**
 * Returns up to `limit` overrides ordered by updated_at DESC, id ASC.
 * Default limit is 200 (debug surface, not a paged UI).
 */
export function listOverrides(limit: number = LIST_OVERRIDES_DEFAULT_LIMIT): readonly Override[] {
  const db = getDB();
  const result = db.executeSync(
    `SELECT id, merchant_key, category_id, source, confidence, created_at, updated_at
     FROM merchant_overrides
     ORDER BY updated_at DESC, id ASC
     LIMIT ?`,
    [limit],
  );
  return Object.freeze(result.rows.map(mapOverrideRow));
}
