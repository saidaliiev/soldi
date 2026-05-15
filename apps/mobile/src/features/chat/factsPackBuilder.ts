/**
 * factsPackBuilder — builds the FactsPack aggregate payload from local op-sqlite.
 *
 * The FactsPack is the ONLY data sent to the ai-query Edge Function (D-17, D-18).
 * It contains only aggregates — no raw transaction descriptions, no row-level PII.
 *
 * Algorithm:
 *   1. Read all transactions in the last 13 months (D-20 client-side clamp)
 *   2. Group by (month, category_slug) → sum cents → monthly_category_sums
 *   3. Group by (month, normalized_merchant_key, category_slug) → sum + count →
 *      top 50 per month → top_merchants_by_month (max 2000 total)
 *   4. Currency: first transaction's currency or default 'EUR'
 *
 * Multi-currency: v1 takes the first transaction's currency.
 * TODO Phase 4: handle multi-currency (EUR + UAH) in FactsPack.
 *
 * merchant_key is normalized (normalizeMerchantKey) — not a raw display name.
 * This further reduces re-identification risk.
 *
 * Security: never logs or returns raw transaction descriptions.
 */

import { getDB } from '@lib/db';
import { normalizeMerchantKey } from '@/src/features/transactions/merchantNormalize';
import type { FactsPack } from '@services/aiQuery';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS_LOOKBACK = 13;
const TOP_MERCHANTS_PER_MONTH = 50;
const MAX_TOTAL_MERCHANTS = 2000;
const MAX_TOTAL_CATEGORY_SUMS = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toYYYYMM(dateSec: number): string {
  const d = new Date(dateSec * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function toYYYYMMDD(dateSec: number): string {
  const d = new Date(dateSec * 1000);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

/**
 * Builds a FactsPack from the last 13 months of local transactions.
 * Pure function over op-sqlite — no network calls.
 *
 * @returns FactsPack ready to be sent to the ai-query Edge Function.
 */
export function buildFactsPack(): FactsPack {
  const db = getDB();
  const now = Date.now();
  const cutoffMs = now - MONTHS_LOOKBACK * 30.5 * 24 * 60 * 60 * 1000;
  const cutoffSec = Math.floor(cutoffMs / 1000);

  const result = db.executeSync(
    `SELECT amount_cents, currency, merchant_name, category_id, date
     FROM transactions
     WHERE date >= ?
     ORDER BY date ASC`,
    [cutoffSec],
  );

  const rows = result.rows as {
    amount_cents: number;
    currency: string;
    merchant_name: string;
    category_id: number | null;
    date: number;
  }[];

  if (rows.length === 0) {
    const todayStr = toYYYYMMDD(Math.floor(now / 1000));
    return {
      currency: 'EUR',
      date_from: todayStr,
      date_to: todayStr,
      monthly_category_sums: [],
      top_merchants_by_month: [],
    };
  }

  // Determine currency from first transaction
  const currency = (rows[0]!.currency ?? 'EUR') as 'EUR' | 'UAH';

  // ---------------------------------------------------------------------------
  // Group by (month, category_slug) → sum_cents
  // ---------------------------------------------------------------------------

  // We need category_slug for each row. The transactions table stores category_id.
  // For simplicity in FactsPack, we use category_id as a stable string key
  // and convert below. But the schema wants category_slug not category_id.
  // We pull category slugs from the categories table via a JOIN query instead.

  const joinResult = db.executeSync(
    `SELECT t.amount_cents, t.currency, t.merchant_name, t.date,
            COALESCE(c.slug, 'other') AS category_slug
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.date >= ?
     ORDER BY t.date ASC`,
    [cutoffSec],
  );

  const joinRows = joinResult.rows as {
    amount_cents: number;
    currency: string;
    merchant_name: string;
    date: number;
    category_slug: string;
  }[];

  // monthly_category_sums accumulator
  const catSumMap = new Map<string, number>();

  // merchant accumulator: key = `${month}|${merchantKey}|${categorySlug}`
  const merchantMap = new Map<
    string,
    { month: string; merchant_key: string; category_slug: string; total_cents: number; count: number }
  >();

  let earliestDateSec = joinRows[0]!.date;

  for (const row of joinRows) {
    if (row.date < earliestDateSec) earliestDateSec = row.date;

    const month = toYYYYMM(row.date);
    const slug = row.category_slug ?? 'other';

    // category sums
    const catKey = `${month}|${slug}`;
    catSumMap.set(catKey, (catSumMap.get(catKey) ?? 0) + row.amount_cents);

    // merchant grouping
    const merchantKey = normalizeMerchantKey(row.merchant_name ?? '');
    if (merchantKey.length >= 1) {
      const mKey = `${month}|${merchantKey}|${slug}`;
      const existing = merchantMap.get(mKey);
      if (existing) {
        existing.total_cents += row.amount_cents;
        existing.count += 1;
      } else {
        merchantMap.set(mKey, {
          month,
          merchant_key: merchantKey,
          category_slug: slug,
          total_cents: row.amount_cents,
          count: 1,
        });
      }
    }
  }

  // Build monthly_category_sums array
  const monthly_category_sums: FactsPack['monthly_category_sums'] = [];
  for (const [key, sum_cents] of catSumMap) {
    const [month, category_slug] = key.split('|') as [string, string];
    monthly_category_sums.push({ month, category_slug, sum_cents });
    if (monthly_category_sums.length >= MAX_TOTAL_CATEGORY_SUMS) break;
  }

  // Build top_merchants_by_month: group by month, sort by |total_cents| desc, top N per month
  const byMonth = new Map<string, typeof merchantMap extends Map<string, infer V> ? V[] : never>();
  for (const entry of merchantMap.values()) {
    const arr = byMonth.get(entry.month) ?? [];
    arr.push(entry);
    byMonth.set(entry.month, arr);
  }

  const top_merchants_by_month: FactsPack['top_merchants_by_month'] = [];
  for (const [, entries] of byMonth) {
    entries.sort((a, b) => Math.abs(b.total_cents) - Math.abs(a.total_cents));
    const top = entries.slice(0, TOP_MERCHANTS_PER_MONTH);
    for (const e of top) {
      top_merchants_by_month.push({
        month: e.month,
        merchant_key: e.merchant_key,
        category_slug: e.category_slug,
        total_cents: e.total_cents,
        count: e.count,
      });
      if (top_merchants_by_month.length >= MAX_TOTAL_MERCHANTS) break;
    }
    if (top_merchants_by_month.length >= MAX_TOTAL_MERCHANTS) break;
  }

  const dateFrom = toYYYYMMDD(earliestDateSec);
  const dateTo = toYYYYMMDD(Math.floor(now / 1000));

  return {
    currency,
    date_from: dateFrom,
    date_to: dateTo,
    monthly_category_sums,
    top_merchants_by_month,
  };
}
