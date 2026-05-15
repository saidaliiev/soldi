/**
 * SOLDI AI categorization — on-ingest fire-and-forget trigger.
 *
 * Called after every successful transaction insert (single or batch). Filters
 * rows where category_id is null, builds the GDPR-safe Edge Function payload,
 * and fires aiCategorizeBatch without awaiting the result (D-06/D-07/D-08).
 *
 * Non-blocking contract (D-08):
 * - Errors are swallowed and logged only — never propagated to the caller.
 * - The insert already succeeded; categorization failure must never roll it back.
 * - The transaction row stays in the "Uncategorized" state until the next
 *   successful categorization attempt.
 *
 * DO NOT call from the synthetic data generator's initial seed — synthetic
 * transactions are pre-categorized by design (PATTERNS.md). Only manual,
 * monobank, and CSV ingest paths wire this trigger.
 *
 * Security:
 * - Only tx_id, merchant_name, mcc_code (as string), amount_cents are sent.
 * - description is intentionally excluded from the payload (CHAT-04 / GDPR).
 */

import { nowSeconds } from '@lib/time';
import { aiCategorizeBatch } from '../../services/aiCategorize';
import {
  updateCategoryBatch,
  type CategoryBatchUpdate,
  type TransactionRow,
} from '@data/transactionsRepo';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Converts mcc_code (number|null) to a 4-digit string or null for the API. */
function mccString(mcc: number | null): string | null {
  if (mcc == null) return null;
  return String(mcc).padStart(4, '0');
}

/** Persist successful categorization results back to op-sqlite. */
async function persistResults(
  result: Awaited<ReturnType<typeof aiCategorizeBatch>>,
): Promise<void> {
  const updates: CategoryBatchUpdate[] = [];
  const now = nowSeconds();

  for (const row of result.results) {
    if ('error' in row) continue; // skip per-row errors — row stays uncategorized
    updates.push({
      id: row.tx_id,
      category_id: row.category_id,
      ai_confidence: row.confidence,
      needs_review: row.needs_review,
      last_ai_attempt_at: now,
    });
  }

  if (updates.length > 0) {
    updateCategoryBatch(updates);
  }
}

/** Swallow + log errors — non-blocking per D-08. */
function logCategorizeError(err: unknown): void {
  // SENTRY: breadcrumb ai.flow=categorize ai.event=trigger_error
  // TODO Phase 5: wire Sentry.addBreadcrumb here
  if (__DEV__) {
    // Only log in development — never log error payloads in production (T-03-01-08)
    console.warn('[aiCategorizeTrigger] background categorize failed:', err instanceof Error ? err.message : String(err));
  }
}

// Edge Function caps at 50 rows per call — chunk large batches.
const EDGE_FN_BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget: categorize inserted rows that have no category_id.
 *
 * Returns void immediately. The categorization happens asynchronously;
 * results are persisted to op-sqlite on success. Errors are swallowed.
 *
 * Skips rows that already have a category_id (e.g. from manual entry
 * where the user already selected a category).
 */
export function fireAndForgetCategorize(insertedRows: readonly TransactionRow[]): void {
  const uncategorized = insertedRows.filter((r) => r.category_id == null);
  if (uncategorized.length === 0) return;

  // Split into Edge Function–sized chunks (max 50 per call).
  for (let i = 0; i < uncategorized.length; i += EDGE_FN_BATCH_SIZE) {
    const chunk = uncategorized.slice(i, i + EDGE_FN_BATCH_SIZE);
    const inputs = chunk.map((r) => ({
      tx_id: r.id,
      merchant_name: r.merchant_name,
      mcc: mccString(r.mcc_code),
      amount_cents: r.amount_cents,
      // NOTE: description intentionally excluded — CHAT-04 / GDPR safety gate
    }));

    // void = intentionally not awaited (D-08 non-blocking contract)
    void aiCategorizeBatch(inputs)
      .then(persistResults)
      .catch(logCategorizeError);
  }
}
