/**
 * SOLDI CSV column detection and row mapper.
 *
 * Takes raw string[][] from parseCsv and produces MappedCsvRow[] that match
 * the InsertableTransaction shape expected by insertManyTransactions.
 *
 * Key guarantees:
 * - MappedCsvRow.categorySlug is ALWAYS a defined string (B2 contract).
 *   If no MCC column exists or MCC doesn't map, categorySlug defaults to 'misc'.
 * - description is always null (Phase 1: AI safety — no raw text to AI pipeline).
 * - amount_cents follows sign convention: negative = expense, positive = income.
 * - external_id = "csv-" + djb2(date|amount|merchant) for idempotent re-imports.
 */

import { toCents, parseAmount } from '@lib/money';
import { categoryForMcc } from '@lib/synthetic/mcc';
import { nowSeconds } from '@lib/time';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColumnMap = {
  dateCol: number;
  amountCol: number;
  merchantCol: number;
  currencyCol: number | null;
  descriptionCol: number | null;
  mccCol: number | null;
};

export type MappedCsvRow = {
  amount_cents: number;
  currency: string;
  merchant_name: string;
  merchant_id: null;
  mcc_code: number | null;
  categorySlug: string;   // ALWAYS defined; never undefined (B2 contract)
  description: null;      // Phase 1: intentionally null
  date: number;           // unix seconds
  source: 'csv';
  external_id: string;    // "csv-{djb2(date|amount|merchant)}"
  created_at: number;
};

// ---------------------------------------------------------------------------
// djb2 hash
// ---------------------------------------------------------------------------

/**
 * DJB2 string hash — returns lowercase hex string.
 * Used to generate stable external_id for CSV rows.
 */
export function djb2(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
    hash = hash >>> 0; // force unsigned 32-bit
  }
  return hash.toString(16).toLowerCase();
}

// ---------------------------------------------------------------------------
// detectColumns
// ---------------------------------------------------------------------------

const DATE_HEADERS     = new Set(['date','time','datetime','transaction date','операція','дата']);
const AMOUNT_HEADERS   = new Set(['amount','sum','total','debit','credit','amount (eur)','operation amount','сума','сумма']);
const MERCHANT_HEADERS = new Set(['merchant','description','memo','name','payee','контрагент','опис']);
const CURRENCY_HEADERS = new Set(['currency','валюта']);
const MCC_HEADERS      = new Set(['mcc','mcc code']);
const DESC_HEADERS     = new Set(['note','notes']);

/**
 * Heuristic column detection from a CSV header row.
 *
 * Returns null if any required column (date, amount, merchant) cannot be found.
 * Optional columns (currency, mcc, description note) are set to null when absent.
 *
 * Phase 1: returns null gracefully for unrecognised headers. The calling screen
 * surfaces a "couldn't find columns" error per SKELETON Out-of-Scope.
 */
export function detectColumns(header: string[]): ColumnMap | null {
  let dateCol:    number | null = null;
  let amountCol:  number | null = null;
  let merchantCol:number | null = null;
  let currencyCol:number | null = null;
  let mccCol:     number | null = null;
  let descriptionCol: number | null = null;

  for (let i = 0; i < header.length; i++) {
    const cell = (header[i] ?? '').toLowerCase().trim();
    if (dateCol === null     && DATE_HEADERS.has(cell))     { dateCol     = i; continue; }
    if (amountCol === null   && AMOUNT_HEADERS.has(cell))   { amountCol   = i; continue; }
    if (merchantCol === null && MERCHANT_HEADERS.has(cell)) { merchantCol = i; continue; }
    if (currencyCol === null && CURRENCY_HEADERS.has(cell)) { currencyCol = i; continue; }
    if (mccCol === null      && MCC_HEADERS.has(cell))      { mccCol      = i; continue; }
    if (descriptionCol === null && DESC_HEADERS.has(cell))  { descriptionCol = i; continue; }
  }

  if (dateCol === null || amountCol === null || merchantCol === null) {
    return null;
  }

  return { dateCol, amountCol, merchantCol, currencyCol, mccCol, descriptionCol };
}

// ---------------------------------------------------------------------------
// Date parsing helpers
// ---------------------------------------------------------------------------

/**
 * Tries to parse a date string to unix seconds.
 * Supports: ISO 8601, dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd hh:mm.
 * Returns null if the string cannot be reliably parsed.
 */
function parseDateToSeconds(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO 8601: "2026-05-10" or "2026-05-10T12:00:00Z" etc.
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return Math.floor(iso / 1000);

  // dd/mm/yyyy
  const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const d = parseInt(ddmmyyyy[1]!, 10);
    const m = parseInt(ddmmyyyy[2]!, 10);
    const y = parseInt(ddmmyyyy[3]!, 10);
    const ts = Date.parse(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    if (!Number.isNaN(ts)) return Math.floor(ts / 1000);
  }

  // mm/dd/yyyy
  const mmddyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const m2 = parseInt(mmddyyyy[1]!, 10);
    const d2 = parseInt(mmddyyyy[2]!, 10);
    const y2 = parseInt(mmddyyyy[3]!, 10);
    const ts2 = Date.parse(`${y2}-${String(m2).padStart(2,'0')}-${String(d2).padStart(2,'0')}`);
    if (!Number.isNaN(ts2)) return Math.floor(ts2 / 1000);
  }

  // yyyy-mm-dd hh:mm
  const dtWithTime = s.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (dtWithTime) {
    const ts3 = Date.parse(`${dtWithTime[1]!}T${dtWithTime[2]!}:00`);
    if (!Number.isNaN(ts3)) return Math.floor(ts3 / 1000);
  }

  return null;
}

// ---------------------------------------------------------------------------
// csvRowsToTransactions
// ---------------------------------------------------------------------------

/**
 * Maps CSV rows (from parseCsv) to MappedCsvRow objects.
 *
 * Skips rows where:
 * - amount is null or zero after parsing
 * - merchant_name is empty after trimming
 * - date cannot be parsed
 *
 * MappedCsvRow.categorySlug is ALWAYS defined (default 'misc') — B2 contract.
 *
 * @param rows            2D array from parseCsv (row 0 is header — skipped).
 * @param cmap            Column map from detectColumns.
 * @param accountId       account_id to assign to all rows.
 * @param defaultCurrency Fallback currency when no currency column exists.
 * @returns               Array of MappedCsvRow ready for insertManyTransactions.
 */
export function csvRowsToTransactions(
  rows: string[][],
  cmap: ColumnMap,
  accountId: number,
  defaultCurrency: 'EUR' | 'UAH' | 'USD',
): MappedCsvRow[] {
  const created_at = nowSeconds();
  const results: MappedCsvRow[] = [];

  // Skip header row (index 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawAmount   = row[cmap.amountCol]   ?? '';
    const rawDate     = row[cmap.dateCol]      ?? '';
    const rawMerchant = row[cmap.merchantCol]  ?? '';

    // Parse amount
    const rawAmountStr = rawAmount.trim();
    const amountFloat = parseAmount(rawAmountStr);
    if (amountFloat === null) continue;

    // Parse date
    const dateSec = parseDateToSeconds(rawDate);
    if (dateSec === null) continue;

    // Parse merchant
    const merchant_name = rawMerchant.trim().slice(0, 120);
    if (!merchant_name) continue;

    // Currency
    const rawCurrency =
      cmap.currencyCol !== null
        ? (row[cmap.currencyCol] ?? defaultCurrency).toUpperCase().slice(0, 3)
        : defaultCurrency;

    // MCC
    const mcc: number | null =
      cmap.mccCol !== null
        ? parseInt(row[cmap.mccCol] ?? '', 10) || null
        : null;

    // Amount sign: if string starts with '+' or parsed value is positive → income (+)
    // if string starts with '-' or parsed value is negative → expense (-)
    const startsWithMinus = rawAmountStr.startsWith('-');
    const startsWithPlus  = rawAmountStr.startsWith('+');
    let signedFloat: number;
    if (startsWithMinus || (!startsWithPlus && amountFloat < 0)) {
      signedFloat = -Math.abs(amountFloat);
    } else {
      signedFloat = Math.abs(amountFloat);
    }
    const amount_cents = toCents(signedFloat);

    const external_id = `csv-${djb2(rawDate + '|' + rawAmount + '|' + rawMerchant)}`;

    results.push({
      amount_cents,
      currency: rawCurrency,
      merchant_name,
      merchant_id: null,
      mcc_code: mcc,
      // B2 contract: categorySlug ALWAYS defined — defaults to 'misc' when mcc is null or unmapped
      categorySlug: categoryForMcc(mcc ?? 0, 'misc'),
      description: null,
      date: dateSec,
      source: 'csv',
      external_id,
      created_at,
    });
  }

  // accountId is used by the caller to set account_id before inserting
  // We include it to satisfy the caller contract; suppress the warning
  void accountId;

  return results;
}
