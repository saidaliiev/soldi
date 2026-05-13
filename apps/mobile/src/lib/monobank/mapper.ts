/**
 * SOLDI monobank statement mapper.
 *
 * Converts monobank API response items into the shape expected by
 * insertManyTransactions (InsertableTransaction).
 *
 * Security / data hygiene:
 * - description column is always NULL — Phase 1 rule: never store raw free-text
 *   descriptions in DB. Phase 3 AI pipeline uses aggregates + merchant_name only.
 * - merchant_name is trimmed, whitespace-collapsed, and capped at 120 chars.
 * - amount_cents follows the sign convention: negative = expense, positive = income
 *   (monobank already uses signed amounts, so we preserve them directly).
 * - external_id = "monobank-{item.id}" — the UNIQUE(source, external_id) constraint
 *   in the DB deduplicates re-syncs automatically.
 */

import { type MonobankStatementItem } from '@api/monobank';
import { resolveMcc } from './mcc-table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MappedRow = {
  amount_cents: number;
  currency: string;
  merchant_name: string;
  merchant_id: string | null;
  mcc_code: number | null;
  categorySlug: string;    // always defined; never undefined
  description: null;       // Phase 1: intentionally null — AI safety
  date: number;            // unix seconds
  source: 'monobank';
  external_id: string;     // "monobank-{item.id}"
  created_at: number;      // unix seconds (caller provides nowSec)
};

// ---------------------------------------------------------------------------
// Currency code → string
// ---------------------------------------------------------------------------

const CURRENCY_CODE_MAP: ReadonlyMap<number, string> = new Map([
  [980, 'UAH'],
  [978, 'EUR'],
  [840, 'USD'],
  [826, 'GBP'],
  [756, 'CHF'],
  [985, 'PLN'],
  [203, 'CZK'],
  [348, 'HUF'],
]);

function currencyString(code: number): string {
  return CURRENCY_CODE_MAP.get(code) ?? String(code);
}

// ---------------------------------------------------------------------------
// mapMonobankItems
// ---------------------------------------------------------------------------

/**
 * Maps an array of monobank statement items to MappedRow objects.
 *
 * @param items   Statement items from getMonobankStatement.
 * @param nowSec  Current unix seconds (injected for testability).
 * @returns       Array of MappedRow ready for insertManyTransactions.
 */
export function mapMonobankItems(
  items: MonobankStatementItem[],
  nowSec: number,
): MappedRow[] {
  return items.map((item) => {
    // Collapse whitespace and truncate merchant_name to 120 chars
    const rawName = item.description ?? '';
    const collapsed = rawName.replace(/\s+/g, ' ').trim();
    const merchant_name = collapsed.slice(0, 120);

    const resolved = resolveMcc(item.mcc, item.originalMcc);

    return {
      amount_cents: item.amount,          // monobank uses signed minor units — matches our convention
      currency: currencyString(item.currencyCode),
      merchant_name,
      merchant_id: item.id,               // stable monobank tx id used as merchant identifier
      mcc_code: item.mcc,
      categorySlug: resolved.slug,        // always a string; never undefined
      description: null,                  // Phase 1: intentionally null
      date: item.time,
      source: 'monobank',
      external_id: `monobank-${item.id}`,
      created_at: nowSec,
    };
  });
}

// ---------------------------------------------------------------------------
// isPotentiallyOversizedBatch
// ---------------------------------------------------------------------------

/**
 * Returns true if the batch size suggests the user may have more data than
 * a single 31-day window can deliver (monobank caps at 500 items per window).
 *
 * Caller uses this to inform the user that data may be truncated.
 */
export function isPotentiallyOversizedBatch(items: MonobankStatementItem[]): boolean {
  return items.length > 1000;
}
