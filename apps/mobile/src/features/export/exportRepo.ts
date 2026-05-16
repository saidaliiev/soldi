/**
 * SOLDI export repository — builds CSV files for data portability (SET-03).
 *
 * D-02: emits two files — transactions.csv and jars.csv — written to
 * the app-sandboxed cache directory (not world-readable — T-05-03).
 * Delivered only via user-initiated expo-sharing share-sheet.
 *
 * Security: catch logs only err.name, never row data or amounts (CLAUDE.md).
 * description column excluded — null for all Phase 1 ingest paths by design.
 *
 * expo-file-system v19: uses File class + Paths.cache (new API).
 */

import { File, Paths } from 'expo-file-system';

import { getDB } from '@lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportUris = {
  transactionsUri: string;
  jarsUri: string;
};

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/** Escape a CSV field value per RFC 4180. */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Wrap in quotes if field contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert column headers + row objects to a CSV string. */
function rowsToCsv(
  headers: readonly string[],
  rows: readonly Record<string, unknown>[]
): string {
  const headerLine = headers.join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(row[h])).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

// ---------------------------------------------------------------------------
// buildExportFiles
// ---------------------------------------------------------------------------

/**
 * Builds transactions.csv and jars.csv in the app's cache directory.
 * Returns URIs suitable for expo-sharing.
 *
 * D-02: description column excluded (null for all Phase 1 ingest paths — AI safety).
 * D-02: jars.csv includes jar_contributions ledger.
 */
export async function buildExportFiles(): Promise<ExportUris> {
  const db = getDB();

  try {
    // --- transactions.csv ---
    // description excluded — null by Phase 1 AI-safety design; no PII surface (D-02)
    const txResult = db.executeSync(
      `SELECT id, date, amount_cents, currency, merchant, category_id, ai_category
       FROM transactions
       ORDER BY date DESC`
    );
    const txHeaders = [
      'id',
      'date',
      'amount_cents',
      'currency',
      'merchant',
      'category_id',
      'ai_category',
    ] as const;
    const txCsv = rowsToCsv(txHeaders, (txResult.rows ?? []) as Record<string, unknown>[]);

    // --- jars.csv — includes jar_contributions ledger (D-02) ---
    const jarsResult = db.executeSync(
      `SELECT j.id AS jar_id,
              j.name AS jar_name,
              j.target_cents,
              jc.amount_cents AS contribution_cents,
              jc.source,
              jc.created_at
       FROM jars j
       LEFT JOIN jar_contributions jc ON jc.jar_id = j.id
       ORDER BY j.id, jc.created_at`
    );
    const jarsHeaders = [
      'jar_id',
      'jar_name',
      'target_cents',
      'contribution_cents',
      'source',
      'created_at',
    ] as const;
    const jarsCsv = rowsToCsv(jarsHeaders, (jarsResult.rows ?? []) as Record<string, unknown>[]);

    // --- write to cache directory (T-05-03: app-sandboxed, not world-readable) ---
    const txFile = new File(Paths.cache, 'transactions.csv');
    const jarsFile = new File(Paths.cache, 'jars.csv');

    txFile.write(txCsv);
    jarsFile.write(jarsCsv);

    return { transactionsUri: txFile.uri, jarsUri: jarsFile.uri };
  } catch (err) {
    // Log only error.name — never row data or amounts (CLAUDE.md security rule T-05-06)
    const name = err instanceof Error ? err.name : 'UnknownError';
    if (__DEV__) console.error('exportRepo failed:', name);
    throw err; // re-throw — ExportButton catches and handles gracefully
  }
}
