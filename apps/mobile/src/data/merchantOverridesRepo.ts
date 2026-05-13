/**
 * SOLDI merchant overrides repository.
 *
 * Provides insert / list / find operations for the merchant_overrides table.
 * Used by the manual entry form to seed per-merchant category preferences,
 * and will be consumed by the Phase 3 AI categorization pipeline.
 *
 * Security: All SQL uses parameterized executeSync() — no string interpolation.
 */

import { getDB } from '@lib/db';
import { nowSeconds } from '@lib/time';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MerchantOverrideRow = {
  id: number;
  merchant_pattern: string;
  category_id: number;
  confidence: number;     // 0..1
  created_by_user: 0 | 1;
  created_at: number;
};

// ---------------------------------------------------------------------------
// addMerchantOverride
// ---------------------------------------------------------------------------

/**
 * Inserts a merchant override and returns the new row's id.
 *
 * The pattern is lower-cased and trimmed before insertion.
 * Uses parameterized INSERT — no string interpolation.
 *
 * @param pattern       Merchant name pattern (will be lower-cased + trimmed).
 * @param categoryId    Category id to map this pattern to.
 * @param createdByUser True when the user explicitly set this override.
 * @returns             New row insertId.
 */
export function addMerchantOverride(
  pattern: string,
  categoryId: number,
  createdByUser: boolean,
): number {
  const db = getDB();
  const normalised = pattern.toLowerCase().trim();
  const result = db.executeSync(
    `INSERT INTO merchant_overrides (merchant_pattern, category_id, confidence, created_by_user, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [normalised, categoryId, 1.0, createdByUser ? 1 : 0, nowSeconds()],
  );
  const insertId = result.insertId;
  if (insertId == null) {
    throw new Error('addMerchantOverride: INSERT did not return an insertId');
  }
  return insertId;
}

// ---------------------------------------------------------------------------
// listMerchantOverrides
// ---------------------------------------------------------------------------

/**
 * Returns all merchant override rows ordered by confidence DESC, id ASC.
 */
export function listMerchantOverrides(): MerchantOverrideRow[] {
  const db = getDB();
  const result = db.executeSync(
    'SELECT id, merchant_pattern, category_id, confidence, created_by_user, created_at FROM merchant_overrides ORDER BY confidence DESC, id ASC',
  );
  return result.rows.map((row) => ({
    id: row['id'] as number,
    merchant_pattern: row['merchant_pattern'] as string,
    category_id: row['category_id'] as number,
    confidence: row['confidence'] as number,
    created_by_user: row['created_by_user'] as 0 | 1,
    created_at: row['created_at'] as number,
  }));
}

// ---------------------------------------------------------------------------
// findOverrideForMerchant
// ---------------------------------------------------------------------------

/**
 * Finds the highest-confidence override for a merchant name.
 *
 * Matches rows where the merchant name (lower-cased) CONTAINS the stored
 * merchant_pattern as a substring. Returns the top result by confidence.
 *
 * @param merchantName  The merchant name to search for.
 * @returns             The best matching override row, or null if none found.
 */
export function findOverrideForMerchant(merchantName: string): MerchantOverrideRow | null {
  const db = getDB();
  const result = db.executeSync(
    `SELECT id, merchant_pattern, category_id, confidence, created_by_user, created_at
     FROM merchant_overrides
     WHERE LOWER(?) LIKE '%' || merchant_pattern || '%'
     ORDER BY confidence DESC
     LIMIT 1`,
    [merchantName],
  );
  const row = result.rows[0];
  if (row == null) return null;
  return {
    id: row['id'] as number,
    merchant_pattern: row['merchant_pattern'] as string,
    category_id: row['category_id'] as number,
    confidence: row['confidence'] as number,
    created_by_user: row['created_by_user'] as 0 | 1,
    created_at: row['created_at'] as number,
  };
}
